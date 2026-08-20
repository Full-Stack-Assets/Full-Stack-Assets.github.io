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


class MarketplaceDynamicRouteContractTests(unittest.TestCase):
    def test_apex_builder_copies_all_dynamic_marketplace_route_trees(self) -> None:
        for route in ("my-library", "publisher", "enterprise"):
            self.assertIn(route, builder.PUBLIC_SOURCE_PATHS)

    def test_apex_artifact_requires_dynamic_roots_and_shared_auth_asset(self) -> None:
        for relative in (
            "my-library/index.html",
            "publisher/index.html",
            "enterprise/index.html",
            "assets/marketplace-auth.js",
        ):
            self.assertIn(relative, builder.REQUIRED_ARTIFACT_FILES)


if __name__ == "__main__":
    unittest.main()
