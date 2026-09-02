from __future__ import annotations

from pathlib import Path
import importlib.util
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools" / "prepare_fullstackassets_pages.py"

spec = importlib.util.spec_from_file_location("pages_builder", SCRIPT)
builder = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(builder)


class ResumeApexRouteContractTests(unittest.TestCase):
    def test_apex_builder_does_not_copy_marketplace_route_trees(self) -> None:
        for route in ("library", "my-library", "publisher", "enterprise", "purchase"):
            self.assertNotIn(route, builder.PUBLIC_SOURCE_PATHS)

    def test_apex_builder_does_not_copy_host_product_shells(self) -> None:
        for route in ("aetheria", "buildgraph"):
            self.assertNotIn(route, builder.PUBLIC_SOURCE_PATHS)
            self.assertIn(route, builder.FORBIDDEN_PUBLIC_PATHS)

    def test_apex_artifact_forbids_marketplace_clients(self) -> None:
        for name in ("marketplace-auth.js", "library-acquire.js"):
            self.assertIn(name, builder.EXCLUDED_ASSET_FILES)
            self.assertNotIn(f"assets/{name}", builder.REQUIRED_ARTIFACT_FILES)


if __name__ == "__main__":
    unittest.main()
