#!/usr/bin/env python3
"""Validate and package the three public starters deterministically.

The script intentionally reads only starter source and writes only the owned
public archive directory plus apps/web/lib/starter-archives.generated.ts.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

PROJECT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = PROJECT / "starters"
OUTPUT_ROOT = PROJECT / "apps" / "web" / "public" / "starters"
MANIFEST_PATH = PROJECT / "apps" / "web" / "lib" / "starter-archives.generated.ts"
SLUGS = ("streaming-chat", "docs-assistant", "agent-launchpad")
CHAT_DEPENDENCIES = {
    "next": "16.4.6",
    "react": "19.2.1",
    "react-dom": "19.2.1",
    "ai": "6.0.326",
    "@ai-sdk/react": "3.0.329",
    "@ai-sdk/openai": "3.0.139",
    "zod": "4.1.12",
}
ALLOWED_SUFFIXES = {
    ".css",
    ".d.ts",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".ts",
    ".tsx",
}
FORBIDDEN_PARTS = {
    ".git",
    ".next",
    ".turbo",
    "__pycache__",
    "build",
    "coverage",
    "dist",
    "node_modules",
}
FORBIDDEN_ENV_NAMES = {".env", ".env.local", ".env.development", ".env.production", ".env.test"}
SECRETISH_FILENAME = re.compile(r"(?:secret|credential|password|token|private[-_]?key)", re.I)
SECRET_PATTERNS = (
    re.compile(r"\bsk-(?:proj-|ant-|live-)?[A-Za-z0-9_-]{20,}\b"),
    re.compile(r"\bAIza[A-Za-z0-9_-]{30,}\b"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b"),
    re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}\b"),
    re.compile(r"\bnpm_[A-Za-z0-9]{20,}\b"),
    re.compile(r"\bAKIA[A-Z0-9]{16}\b"),
    re.compile(r"(?:api[_-]?key|client[_-]?secret|access[_-]?token|password|secret)\s*[:=]\s*[\"'][^\"'\n]{12,}[\"']", re.I),
    re.compile(r"(?:postgres(?:ql)?|mysql)://[^\s/:]+:[^\s@]+@", re.I),
)
REQUIRED = {
    "streaming-chat": {
        ".env.example",
        "README.md",
        "app/api/chat/route.ts",
        "app/chat.tsx",
        "app/globals.css",
        "app/layout.tsx",
        "app/page.tsx",
        "lib/request-policy.ts",
        "next-env.d.ts",
        "next.config.mjs",
        "package.json",
        "tsconfig.json",
    },
    "docs-assistant": {
        ".env.example",
        "README.md",
        "app/api/chat/route.ts",
        "app/chat.tsx",
        "app/globals.css",
        "app/layout.tsx",
        "app/page.tsx",
        "lib/knowledge.ts",
        "lib/request-policy.ts",
        "next-env.d.ts",
        "next.config.mjs",
        "package.json",
        "tsconfig.json",
    },
    "agent-launchpad": {
        "README.md",
        "package.json",
        "public/app.js",
        "public/index.html",
        "public/styles.css",
        "scripts/build.mjs",
        "scripts/dev.mjs",
    },
}


class PackageError(RuntimeError):
    pass


def fail(message: str) -> "NoReturn":
    raise PackageError(message)


def relative_text(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def validate_text(path: Path) -> bytes:
    data = path.read_bytes()
    if b"\x00" in data:
        fail(f"binary/NUL content is not allowed: {path}")
    try:
        data.decode("utf-8")
    except UnicodeDecodeError as exc:
        fail(f"non-UTF-8 content is not allowed: {path}: {exc}")
    return data


def validate_package_json(slug: str, root: Path, files: set[str]) -> None:
    package_path = root / "package.json"
    if "package.json" not in files:
        fail(f"{slug}: package.json is required")
    try:
        package = json.loads(package_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"{slug}: invalid package.json: {exc}")
    if package.get("private") is not True:
        fail(f"{slug}: package.json must be private")
    if "@aisdkpro" in json.dumps(package, ensure_ascii=False):
        fail(f"{slug}: unpublished @aisdkpro dependency is not allowed")
    if slug in ("streaming-chat", "docs-assistant"):
        deps = package.get("dependencies", {})
        for name, version in CHAT_DEPENDENCIES.items():
            if deps.get(name) != version:
                fail(f"{slug}: dependency {name} must be pinned to {version}")
        scripts = package.get("scripts", {})
        for script in ("dev", "build", "typecheck"):
            if not isinstance(scripts.get(script), str) or not scripts[script]:
                fail(f"{slug}: package.json needs an npm run {script} script")
    else:
        if package.get("dependencies") or package.get("devDependencies"):
            fail("agent-launchpad: package.json must have no runtime or dev dependencies")
        if set(package.get("scripts", {})) != {"dev", "build"}:
            fail("agent-launchpad: package.json must expose only dev and build scripts")


def collect_files(slug: str) -> tuple[list[tuple[str, bytes]], set[str]]:
    root = SOURCE_ROOT / slug
    if not root.is_dir():
        fail(f"missing starter directory: {root}")
    collected: list[tuple[str, bytes]] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.is_symlink():
            continue
        rel = relative_text(path, root)
        parts = PurePosixPath(rel).parts
        name = path.name
        if '\\' in rel or ':' in rel or '..' in parts:
            fail(f"unsafe archive path: {slug}/{rel}")
        if any(part in FORBIDDEN_PARTS for part in parts):
            continue
        if name in FORBIDDEN_ENV_NAMES or (name.startswith(".env.") and name != ".env.example"):
            continue
        if SECRETISH_FILENAME.search(name):
            fail(f"filename looks credential-bearing and is not allowlisted: {slug}/{rel}")
        if name != ".env.example" and path.suffix not in ALLOWED_SUFFIXES:
            continue
        data = validate_text(path)
        collected.append((rel, data))

    files = {rel for rel, _ in collected}
    missing = REQUIRED[slug] - files
    if missing:
        fail(f"{slug}: required files missing: {', '.join(sorted(missing))}")
    validate_package_json(slug, root, files)
    return collected, files


def validate_source_content(slug: str, files: list[tuple[str, bytes]]) -> None:
    joined = "\n".join(data.decode("utf-8") for _, data in files)
    if "@aisdkpro" in joined or "node_modules/" in joined:
        fail(f"{slug}: unpublished package or node_modules reference found")
    if re.search(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----", joined):
        fail(f"{slug}: private key material found")
    if any(pattern.search(joined) for pattern in SECRET_PATTERNS):
        fail(f"{slug}: credential-looking content found; remove it before packaging")
    if slug == "agent-launchpad" and "public/index.html" not in {rel for rel, _ in files}:
        fail("agent-launchpad: public index is required")


def archive_bytes(slug: str, files: list[tuple[str, bytes]]) -> bytes:
    import io

    output = io.BytesIO()
    with zipfile.ZipFile(
        output,
        mode="w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
        strict_timestamps=False,
    ) as archive:
        for rel, data in sorted(files, key=lambda item: item[0]):
            info = zipfile.ZipInfo(f"{slug}/{rel}")
            info.date_time = (1980, 1, 1, 0, 0, 0)
            info.create_system = 3
            info.create_version = 20
            info.extract_version = 20
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            info.comment = b""
            info.extra = b""
            archive.writestr(info, data)
    return output.getvalue()


def check_crc(path: Path, expected_names: set[str]) -> None:
    with zipfile.ZipFile(path, mode="r") as archive:
        names = set(archive.namelist())
        if archive.testzip() is not None:
            fail(f"CRC check failed: {path}")
        if names != {f"{path.stem.rsplit('-', 1)[0]}/{name}" for name in expected_names}:
            fail(f"archive file list mismatch: {path}")


def manifest_source(records: dict[str, dict[str, object]]) -> str:
    lines = [
        "// Generated by scripts/package-starters.py. Do not edit by hand.",
        "export type StarterArchive = {",
        "  fileName: string;",
        "  bytes: number;",
        "  fileCount: number;",
        "  sha256: string;",
        "};",
        "",
        "export const starterArchives = {",
    ]
    for slug in SLUGS:
        record = records[slug]
        lines.extend(
            [
                f'  "{slug}": {{',
                f'    fileName: {json.dumps(record["fileName"])},',
                f'    bytes: {record["bytes"]},',
                f'    fileCount: {record["fileCount"]},',
                f'    sha256: {json.dumps(record["sha256"])},',
                "  },",
            ]
        )
    lines.extend(["} as const satisfies Record<string, StarterArchive>;", ""])
    return "\n".join(lines)


def package_all() -> dict[str, dict[str, object]]:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    records: dict[str, dict[str, object]] = {}
    # Validate every starter and CRC in staging BEFORE touching live downloads.
    # Hash-named archives are immutable; old files remain available until a full
    # successful promotion. A failed validation leaves the old manifest intact.
    with tempfile.TemporaryDirectory(prefix='.starter-stage-', dir=OUTPUT_ROOT) as temporary:
        stage = Path(temporary)
        for slug in SLUGS:
            files, names = collect_files(slug)
            validate_source_content(slug, files)
            data = archive_bytes(slug, files)
            digest = hashlib.sha256(data).hexdigest()
            filename = f"{slug}-{digest[:12]}.zip"
            output = stage / filename
            output.write_bytes(data)
            check_crc(output, names)
            records[slug] = {
                "fileName": filename,
                "bytes": len(data),
                "fileCount": len(files),
                "sha256": digest,
            }
        staged_manifest = stage / 'manifest.ts'
        staged_manifest.write_text(manifest_source(records), encoding='utf-8')
        for record in records.values():
            filename = str(record['fileName'])
            os.replace(stage / filename, OUTPUT_ROOT / filename)
        MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
        os.replace(staged_manifest, MANIFEST_PATH)
    # Retain old immutable hash-named archives so cached/open pages keep working.
    # Garbage collection is a separate intentional maintenance operation.
    for slug, record in records.items():
        print(f"{slug}: {record['fileName']} ({record['bytes']} bytes, {record['fileCount']} files, CRC ok)")
    print(f"manifest: {MANIFEST_PATH}")
    return records


def check_existing() -> None:
    records = package_all()
    for slug, record in records.items():
        path = OUTPUT_ROOT / str(record["fileName"])
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != record["sha256"]:
            fail(f"digest mismatch after packaging: {slug}")
    print("all starters validated and packaged deterministically")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="package and re-check all archives")
    parser.parse_args()
    try:
        check_existing()
    except PackageError as exc:
        print(f"package-starters.py: error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
