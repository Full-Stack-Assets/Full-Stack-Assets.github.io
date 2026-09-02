from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools" / "prepare_fullstackassets_pages.py"


class PrepareFullstackassetsPagesTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tempdir.name)
        self.host = self.root / "host"
        self.source = self.root / "source"
        self.output = self.root / "site"
        self.host.mkdir()
        self.source.mkdir()

        (self.host / "aetheria").mkdir()
        (self.host / "aetheria" / "index.html").write_text("host product, not public\n", encoding="utf-8")
        (self.host / "buildgraph").mkdir()
        (self.host / "buildgraph" / "index.html").write_text("host product, not public\n", encoding="utf-8")
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
            "<p>Agentic Capability Library</p>", encoding="utf-8"
        )
        (self.source / "library" / "search-index.json").write_text("[]\n", encoding="utf-8")
        (self.source / "assets" / "style.css").write_text("body{}", encoding="utf-8")
        (self.source / "assets" / "marketplace-auth.js").write_text(
            "export const auth = true;\n", encoding="utf-8"
        )
        (self.source / "assets" / "library-acquire.js").write_text(
            "export const endpoint = '/v1/acquire/free';\n", encoding="utf-8"
        )
        (self.source / "robots.txt").write_text("User-agent: *\nAllow: /\n", encoding="utf-8")
        (self.source / "sitemap.xml").write_text(
            "<urlset><url><loc>https://fullstackassets.com/resume/</loc></url></urlset>",
            encoding="utf-8",
        )
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

    def test_builds_resume_only_artifact_and_removes_vercel_loader(self) -> None:
        result = self.run_builder()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((self.output / "index.html").is_file())
        self.assertTrue((self.output / "resume" / "index.html").is_file())
        self.assertTrue((self.output / "services" / "index.html").is_file())
        self.assertTrue((self.output / "assets" / "style.css").is_file())
        self.assertEqual((self.output / "CNAME").read_text(encoding="utf-8"), "fullstackassets.com\n")
        self.assertTrue((self.output / ".nojekyll").is_file())
        self.assertFalse((self.output / "docs").exists())
        self.assertFalse((self.output / "products").exists())
        self.assertFalse((self.output / "library").exists())
        self.assertFalse((self.output / "my-library").exists())
        self.assertFalse((self.output / "publisher").exists())
        self.assertFalse((self.output / "enterprise").exists())
        self.assertFalse((self.output / "purchase").exists())
        self.assertFalse((self.output / "aetheria").exists())
        self.assertFalse((self.output / "buildgraph").exists())
        self.assertFalse((self.output / "assets" / "marketplace-auth.js").exists())
        self.assertFalse((self.output / "assets" / "library-acquire.js").exists())

        html = "\n".join(
            path.read_text(encoding="utf-8") for path in self.output.rglob("*.html")
        )
        self.assertNotIn("/_vercel/insights", html)
        self.assertNotIn("window.va", html)
        self.assertIn("googletagmanager.com", html)
        self.assertNotIn('href="/library/"', html)
        sitemap = (self.output / "sitemap.xml").read_text(encoding="utf-8")
        self.assertNotIn("https://fullstackassets.com/library/", sitemap)

    def test_fails_closed_when_required_source_path_is_missing(self) -> None:
        (self.source / "sitemap.xml").unlink()

        result = self.run_builder()

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("missing required source path: sitemap.xml", result.stderr)

    def test_succeeds_when_generated_library_is_absent_from_source(self) -> None:
        for path in sorted((self.source / "library").rglob("*"), reverse=True):
            if path.is_file():
                path.unlink()
        (self.source / "library").rmdir()

        result = self.run_builder()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse((self.output / "library").exists())

    @unittest.skipUnless(hasattr(os, "symlink"), "symlinks are unavailable")
    def test_rejects_symbolic_links_before_publishing(self) -> None:
        os.symlink(self.source / "resume" / "index.html", self.source / "resume" / "alias.html")

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
        self.assertIn('"$pages_head_sha" == "$GITHUB_SHA"', workflow)
        self.assertIn('"$pages_status" == "completed"', workflow)
        self.assertIn('"$pages_conclusion" == "success"', workflow)
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

    def test_workflow_does_not_build_or_inject_library_onto_the_apex(self) -> None:
        workflow = (ROOT / ".github" / "workflows" / "fullstackassets-pages.yml").read_text(
            encoding="utf-8"
        )
        forbidden = [
            "Inject canonical Library discovery link",
            "Inject canonical Library sitemap root",
            "Build canonical Library",
            "Materialize canonical Library catalog",
            "source/marketplace/bin/materialize-catalog.mjs",
            "source/marketplace/bin/build-library.mjs",
            "source/marketplace/bin/inject-library-discovery.mjs",
            "source/marketplace/bin/inject-library-sitemap.mjs",
            "test -f site/library/index.html",
            "test -f site/assets/library-acquire.js",
            "test -f site/aetheria/index.html",
            "test -f site/buildgraph/index.html",
        ]
        for label in forbidden:
            self.assertNotIn(label, workflow)
        self.assertIn("Verify résumé-only Pages artifact", workflow)
        self.assertIn("! grep -q 'https://fullstackassets.com/library/' site/sitemap.xml", workflow)
        self.assertIn("! grep -q 'href=\"/library/\"' site/index.html", workflow)
        self.assertIn("test ! -e site/library", workflow)


if __name__ == "__main__":
    unittest.main()
