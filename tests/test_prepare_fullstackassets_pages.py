from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools" / "prepare_fullstackassets_pages.py"
HOST_RUNTIME_FILES = (
    "aetheria/index.html",
    "aetheria/app.js",
    "aetheria/styles.css",
    "buildgraph/index.html",
    "buildgraph/app.js",
    "buildgraph/core.mjs",
    "buildgraph/styles.css",
    "buildgraph/data/projects.json",
)


class PrepareFullstackassetsPagesTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tempdir.name)
        self.host = self.root / "host"
        self.source = self.root / "source"
        self.output = self.root / "site"
        self.host.mkdir()
        self.source.mkdir()

        for relative in HOST_RUNTIME_FILES:
            target = self.host / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(f"fixture for {relative}\n", encoding="utf-8")

        (self.host / "docs").mkdir()
        (self.host / "docs" / "internal.md").write_text("not public", encoding="utf-8")

        (self.source / "index.html").write_text(
            """<!doctype html>
<html><head>
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-123"></script>
<script>
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
</script>
<script defer src="/_vercel/insights/script.js"></script>
</head><body>Portfolio</body></html>
""",
            encoding="utf-8",
        )
        for directory in (
            "assets",
            "blog",
            "case-studies",
            "my-library",
            "publisher",
            "enterprise",
            "purchase",
            "resume",
            "services",
        ):
            target = self.source / directory
            target.mkdir()
            (target / "index.html").write_text(
                '<script defer src="/_vercel/insights/script.js"></script><p>page</p>',
                encoding="utf-8",
            )
        (self.source / "library").mkdir()
        (self.source / "library" / "index.html").write_text(
            '<p>Agentic Capability Library</p>', encoding="utf-8"
        )
        (self.source / "library" / "search-index.json").write_text("[]\n", encoding="utf-8")
        (self.source / "assets" / "style.css").write_text("body{}", encoding="utf-8")
        (self.source / "assets" / "marketplace-auth.js").write_text(
            "export const auth = true;\n", encoding="utf-8"
        )
        (self.source / "robots.txt").write_text("User-agent: *\nAllow: /\n", encoding="utf-8")
        (self.source / "sitemap.xml").write_text("<urlset></urlset>", encoding="utf-8")
        (self.source / "products").mkdir()
        (self.source / "products" / "private-source.txt").write_text("exclude", encoding="utf-8")

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def run_builder(self) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--host",
                str(self.host),
                "--source",
                str(self.source),
                "--output",
                str(self.output),
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )

    def test_builds_verified_pages_artifact_and_removes_vercel_loader(self) -> None:
        result = self.run_builder()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((self.output / "index.html").is_file())
        self.assertTrue((self.output / "aetheria" / "index.html").is_file())
        self.assertTrue((self.output / "buildgraph" / "index.html").is_file())
        self.assertTrue((self.output / "library" / "index.html").is_file())
        self.assertTrue((self.output / "library" / "search-index.json").is_file())
        self.assertTrue((self.output / "my-library" / "index.html").is_file())
        self.assertTrue((self.output / "publisher" / "index.html").is_file())
        self.assertTrue((self.output / "enterprise" / "index.html").is_file())
        self.assertTrue((self.output / "assets" / "marketplace-auth.js").is_file())
        for relative in HOST_RUNTIME_FILES:
            self.assertTrue((self.output / relative).is_file(), relative)
        self.assertEqual((self.output / "CNAME").read_text(encoding="utf-8"), "fullstackassets.com\n")
        self.assertTrue((self.output / ".nojekyll").is_file())
        self.assertFalse((self.output / "docs").exists())
        self.assertFalse((self.output / "products").exists())

        html = "\n".join(
            path.read_text(encoding="utf-8") for path in self.output.rglob("*.html")
        )
        self.assertNotIn("/_vercel/insights", html)
        self.assertNotIn("window.va", html)
        self.assertIn("googletagmanager.com", html)

    def test_fails_closed_when_required_source_path_is_missing(self) -> None:
        (self.source / "sitemap.xml").unlink()

        result = self.run_builder()

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("missing required source path: sitemap.xml", result.stderr)

    def test_fails_closed_when_generated_library_is_missing(self) -> None:
        for path in sorted((self.source / "library").rglob("*"), reverse=True):
            if path.is_file():
                path.unlink()
        (self.source / "library").rmdir()

        result = self.run_builder()

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("missing required source path: library", result.stderr)

    def test_fails_closed_when_a_host_runtime_file_is_missing(self) -> None:
        for relative in HOST_RUNTIME_FILES:
            with self.subTest(relative=relative):
                missing = self.host / relative
                original = missing.read_bytes()
                missing.unlink()

                result = self.run_builder()

                self.assertNotEqual(result.returncode, 0)
                self.assertIn(f"missing required host file: {relative}", result.stderr)
                missing.parent.mkdir(parents=True, exist_ok=True)
                missing.write_bytes(original)

    @unittest.skipUnless(hasattr(os, "symlink"), "symlinks are unavailable")
    def test_rejects_symbolic_links_before_publishing(self) -> None:
        os.symlink(self.host / "aetheria" / "index.html", self.host / "aetheria" / "alias.html")

        result = self.run_builder()

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("symbolic link is not allowed", result.stderr)


class PagesWorkflowTests(unittest.TestCase):
    def test_workflow_deploys_verified_artifact_after_builtin_pages_run(self) -> None:
        workflow = (ROOT / ".github" / "workflows" / "fullstackassets-pages.yml").read_text(
            encoding="utf-8"
        )

        self.assertNotIn("build_type=workflow", workflow)
        self.assertIn("actions: read", workflow)
        self.assertIn("Wait for built-in Pages deployment for this commit", workflow)
        self.assertIn("event=dynamic", workflow)
        self.assertIn("pages build and deployment", workflow)
        self.assertIn('\"$pages_head_sha\" == \"$GITHUB_SHA\"', workflow)
        self.assertIn('\"$pages_status\" == \"completed\"', workflow)
        self.assertIn('\"$pages_conclusion\" == \"success\"', workflow)
        self.assertNotIn("pages/builds/latest", workflow)
        self.assertLess(
            workflow.index("Wait for built-in Pages deployment for this commit"),
            workflow.index("Upload Pages artifact"),
        )
        production_condition = (
            "github.event_name != 'pull_request' && github.ref == 'refs/heads/main'"
        )
        self.assertNotIn("github.event_name == 'push'", workflow)
        self.assertGreaterEqual(workflow.count(production_condition), 4)
        self.assertIn("push:\n    branches: [main]\n  workflow_dispatch:", workflow)
        self.assertIn("actions/setup-node@v4", workflow)
        self.assertIn("tests/buildgraph-core.test.mjs", workflow)
        self.assertIn("tests/buildgraph-data.test.mjs", workflow)
        self.assertIn("tests/buildgraph-interface.test.mjs", workflow)
        for relative in HOST_RUNTIME_FILES:
            self.assertIn(f"test -f site/{relative}", workflow)

    def test_workflow_builds_canonical_library_before_apex_artifact(self) -> None:
        workflow = (ROOT / ".github" / "workflows" / "fullstackassets-pages.yml").read_text(
            encoding="utf-8"
        )
        required = [
            "Verify canonical Library source",
            "Materialize canonical Library catalog",
            "Inject canonical Library discovery link",
            "Inject canonical Library sitemap root",
            "Build canonical Library",
            "Verify assembled canonical source",
            "Build verified Pages artifact",
        ]
        for label in required:
            self.assertIn(label, workflow)
        positions = [workflow.index(label) for label in required]
        self.assertEqual(positions, sorted(positions))
        self.assertIn("source/marketplace/bin/materialize-catalog.mjs", workflow)
        self.assertIn("source/marketplace/bin/build-library.mjs", workflow)
        self.assertIn("source/marketplace/bin/inject-library-discovery.mjs", workflow)
        self.assertIn("source/marketplace/bin/inject-library-sitemap.mjs", workflow)
        self.assertIn("test -f site/library/index.html", workflow)


if __name__ == "__main__":
    unittest.main()
