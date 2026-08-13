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

        for namespace in ("aetheria", "buildgraph"):
            target = self.host / namespace
            target.mkdir()
            (target / "index.html").write_text(f"<h1>{namespace}</h1>", encoding="utf-8")

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
        for directory in ("assets", "blog", "case-studies", "purchase", "resume", "services"):
            target = self.source / directory
            target.mkdir()
            (target / "index.html").write_text(
                '<script defer src="/_vercel/insights/script.js"></script><p>page</p>',
                encoding="utf-8",
            )
        (self.source / "assets" / "style.css").write_text("body{}", encoding="utf-8")
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

    @unittest.skipUnless(hasattr(os, "symlink"), "symlinks are unavailable")
    def test_rejects_symbolic_links_before_publishing(self) -> None:
        os.symlink(self.host / "aetheria" / "index.html", self.host / "aetheria" / "alias.html")

        result = self.run_builder()

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("symbolic link is not allowed", result.stderr)


class PagesWorkflowTests(unittest.TestCase):
    def test_workflow_deploys_verified_artifact_after_legacy_build(self) -> None:
        workflow = (ROOT / ".github" / "workflows" / "fullstackassets-pages.yml").read_text(
            encoding="utf-8"
        )

        self.assertNotIn("build_type=workflow", workflow)
        self.assertIn("Wait for legacy Pages build for this commit", workflow)
        self.assertIn('repos/${GITHUB_REPOSITORY}/pages/builds/latest', workflow)
        self.assertIn('\"$legacy_commit\" == \"$GITHUB_SHA\"', workflow)
        self.assertIn('\"$legacy_status\" == \"built\"', workflow)
        self.assertIn('\"$legacy_status\" == \"errored\"', workflow)
        self.assertLess(
            workflow.index("Wait for legacy Pages build for this commit"),
            workflow.index("Upload Pages artifact"),
        )
        self.assertIn("push:\n    branches: [main]\n  workflow_dispatch:", workflow)


if __name__ == "__main__":
    unittest.main()
