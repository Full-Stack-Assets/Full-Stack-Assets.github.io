#!/usr/bin/env python3
"""Build and verify the Fullstackassets.com GitHub Pages artifact."""

from __future__ import annotations

import argparse
from pathlib import Path
import re
import shutil
import sys
from typing import Iterable


DOMAIN = "fullstackassets.com"
PUBLIC_SOURCE_PATHS = (
    "index.html",
    "assets",
    "blog",
    "case-studies",
    "purchase",
    "resume",
    "services",
    "robots.txt",
    "sitemap.xml",
)
PRESERVED_HOST_PATHS = ("aetheria", "buildgraph")
REQUIRED_ARTIFACT_FILES = ("index.html", "robots.txt", "sitemap.xml", "CNAME", ".nojekyll")

VERCEL_BOOTSTRAP_RE = re.compile(
    r"\s*<script(?:\s[^>]*)?>\s*window\.va\s*=.*?</script>\s*",
    flags=re.IGNORECASE | re.DOTALL,
)
VERCEL_LOADER_RE = re.compile(
    r"\s*<script\b[^>]*\bsrc=(?P<quote>['\"])/_vercel/insights/script\.js(?P=quote)[^>]*>\s*</script>\s*",
    flags=re.IGNORECASE | re.DOTALL,
)


class ArtifactError(RuntimeError):
    """Raised when a Pages artifact cannot be built safely."""


def _reject_symlinks(root: Path) -> None:
    if root.is_symlink():
        raise ArtifactError(f"symbolic link is not allowed: {root}")
    for path in root.rglob("*"):
        if path.is_symlink():
            raise ArtifactError(f"symbolic link is not allowed: {path}")


def _validate_required_paths(root: Path, paths: Iterable[str], *, label: str) -> None:
    for relative in paths:
        candidate = root / relative
        if not candidate.exists():
            raise ArtifactError(f"missing required {label} path: {relative}")


def _copy_path(source_root: Path, output_root: Path, relative: str) -> None:
    source = source_root / relative
    destination = output_root / relative
    if source.is_dir():
        shutil.copytree(source, destination, copy_function=shutil.copy2)
    else:
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)


def _strip_vercel_analytics(output_root: Path) -> None:
    for html_path in output_root.rglob("*.html"):
        text = html_path.read_text(encoding="utf-8")
        cleaned = VERCEL_BOOTSTRAP_RE.sub("\n", text)
        cleaned = VERCEL_LOADER_RE.sub("\n", cleaned)
        html_path.write_text(cleaned, encoding="utf-8")


def _audit_artifact(output_root: Path) -> None:
    _validate_required_paths(output_root, REQUIRED_ARTIFACT_FILES, label="artifact")
    _reject_symlinks(output_root)

    cname = (output_root / "CNAME").read_text(encoding="utf-8")
    if cname != f"{DOMAIN}\n":
        raise ArtifactError(f"CNAME must contain exactly {DOMAIN}")

    for html_path in output_root.rglob("*.html"):
        text = html_path.read_text(encoding="utf-8")
        if "/_vercel/insights" in text or "window.va" in text:
            raise ArtifactError(f"Vercel Analytics reference remains in {html_path}")


def prepare_site(host_root: Path, source_root: Path, output_root: Path) -> None:
    """Create a clean Pages artifact from the host and canonical source repositories."""
    host_root = host_root.resolve()
    source_root = source_root.resolve()
    output_root = output_root.resolve()

    if not host_root.is_dir():
        raise ArtifactError(f"host repository directory does not exist: {host_root}")
    if not source_root.is_dir():
        raise ArtifactError(f"source repository directory does not exist: {source_root}")
    if output_root == host_root or output_root == source_root:
        raise ArtifactError("output directory must be separate from both repositories")

    _validate_required_paths(source_root, PUBLIC_SOURCE_PATHS, label="source")
    _validate_required_paths(host_root, PRESERVED_HOST_PATHS, label="host")
    _reject_symlinks(source_root)
    _reject_symlinks(host_root)

    if output_root.exists():
        shutil.rmtree(output_root)
    output_root.mkdir(parents=True)

    for relative in PRESERVED_HOST_PATHS:
        _copy_path(host_root, output_root, relative)
    for relative in PUBLIC_SOURCE_PATHS:
        _copy_path(source_root, output_root, relative)

    (output_root / "CNAME").write_text(f"{DOMAIN}\n", encoding="utf-8")
    (output_root / ".nojekyll").touch()

    _strip_vercel_analytics(output_root)
    _audit_artifact(output_root)


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", type=Path, required=True, help="Pages host checkout")
    parser.add_argument("--source", type=Path, required=True, help="Canonical site checkout")
    parser.add_argument("--output", type=Path, required=True, help="Artifact output directory")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    try:
        prepare_site(args.host, args.source, args.output)
    except (ArtifactError, OSError, UnicodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    print(f"Prepared verified GitHub Pages artifact at {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
