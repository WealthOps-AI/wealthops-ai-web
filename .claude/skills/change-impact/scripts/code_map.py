#!/usr/bin/env python3
"""Small, local-only repository inventory and source dependency navigator."""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Iterable


SKIP_DIRS = {
    ".git",
    "graphify-out",
    ".hg",
    ".svn",
    ".agent-cache",
    "agent-cache",
    ".next",
    ".nuxt",
    ".terraform",
    ".venv",
    "bin",
    "build",
    "coverage",
    "dist",
    "generated",
    "node_modules",
    "obj",
    "packages",
    "target",
    "vendor",
    "__pycache__",
}
SOURCE_EXTENSIONS = {
    ".c",
    ".cc",
    ".cpp",
    ".cs",
    ".csproj",
    ".css",
    ".go",
    ".h",
    ".html",
    ".java",
    ".js",
    ".jsx",
    ".json",
    ".kt",
    ".md",
    ".mjs",
    ".cjs",
    ".php",
    ".py",
    ".pyi",
    ".rb",
    ".rs",
    ".scss",
    ".sh",
    ".sql",
    ".svelte",
    ".swift",
    ".tf",
    ".toml",
    ".ts",
    ".tsx",
    ".vue",
    ".xml",
    ".yaml",
    ".yml",
}
RESOLVABLE_EXTENSIONS = (
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".py",
    ".pyi",
)
MAX_FILE_BYTES = 512_000


def normalized_root(path: str | Path) -> Path:
    root = Path(path).expanduser().resolve()
    if not root.is_dir():
        raise ValueError(f"Repository root is not a directory: {root}")
    return root


def include_path(relative: Path) -> bool:
    if any(part in SKIP_DIRS for part in relative.parts):
        return False
    return relative.suffix.lower() in SOURCE_EXTENSIONS


def tracked_files(root: Path) -> list[Path]:
    try:
        result = subprocess.run(
            ["git", "-C", str(root), "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
            check=True,
            capture_output=True,
        )
        names = result.stdout.decode("utf-8", errors="replace").split("\0")
        paths = [Path(name) for name in names if name]
    except (OSError, subprocess.CalledProcessError):
        paths = []
        for current, directories, filenames in os.walk(root):
            directories[:] = sorted(name for name in directories if name not in SKIP_DIRS)
            base = Path(current)
            paths.extend((base / name).relative_to(root) for name in filenames)

    result_paths: list[Path] = []
    for relative in paths:
        if not include_path(relative):
            continue
        full_path = root / relative
        try:
            if (
                not full_path.is_symlink()
                and full_path.is_file()
                and full_path.stat().st_size <= MAX_FILE_BYTES
            ):
                result_paths.append(relative)
        except OSError:
            continue
    return sorted(
        set(result_paths),
        key=lambda path: (path.suffix.lower() == ".md", path.as_posix().lower()),
    )


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def relative_display(path: Path) -> str:
    return path.as_posix()


def require_external_output(root: Path, output_path: Path) -> Path:
    resolved = output_path.expanduser().resolve()
    try:
        relative = resolved.relative_to(root)
    except ValueError:
        return resolved
    if relative.parts and relative.parts[0] == "agent-cache":
        return resolved
    raise ValueError(f"generated maps must be written outside the repository: {resolved}")


def repository_branch(root: Path) -> str:
    try:
        result = subprocess.run(
            ["git", "-C", str(root), "branch", "--show-current"],
            check=True,
            capture_output=True,
            text=True,
        )
        return result.stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return ""


def top_level_counts(paths: Iterable[Path]) -> Counter[str]:
    counts: Counter[str] = Counter()
    for path in paths:
        counts[path.parts[0] if len(path.parts) > 1 else "(root)"] += 1
    return counts


def format_repository_map(root: Path, limit: int) -> str:
    files = tracked_files(root)
    if not files:
        return f"# Repository map: {root.name}\n\nNo supported source or documentation files found in {root}."

    extensions = Counter(path.suffix.lower() or "(no extension)" for path in files)
    branch = repository_branch(root)
    lines = [f"# Repository map: {root.name}", "", f"Root: {root}"]
    if branch:
        lines.append(f"Branch: {branch}")
    lines.append(f"Indexed files: {len(files)} (generated/binary outputs excluded)")
    lines.append(
        "Languages/file types: "
        + ", ".join(
            f"{extension} {count}" for extension, count in extensions.most_common(limit)
        )
    )

    lines.extend(["", "Top-level areas:"])
    for name, count in top_level_counts(files).most_common(limit):
        lines.append(f"- {name}/ ({count} files)" if name != "(root)" else f"- root ({count} files)")

    important_names = {
        "readme.md",
        "package.json",
        "pyproject.toml",
        "cargo.toml",
        "go.mod",
        "pom.xml",
        "build.gradle",
        "dockerfile",
        "compose.yml",
        "compose.yaml",
        "program.cs",
    }
    important = [path for path in files if path.name.lower() in important_names]
    if important:
        lines.extend(["", "Entry points and project manifests:"])
        for path in important[:limit]:
            lines.append(f"- {relative_display(path)}")
        if len(important) > limit:
            lines.append(f"- ... {len(important) - limit} more")

    return "\n".join(lines)


def command_map(args: argparse.Namespace) -> int:
    root = normalized_root(args.root)
    report = format_repository_map(root, args.limit)
    if args.output:
        output_path = require_external_output(root, Path(args.output))
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(report + "\n", encoding="utf-8")
        print(f"Wrote repository map: {output_path}")
    else:
        print(report)

    return 0


def command_workspace(args: argparse.Namespace) -> int:
    root = normalized_root(args.root)
    repository_roots: set[Path] = set()
    for current, directories, _ in os.walk(root):
        current_path = Path(current)
        directories[:] = sorted(name for name in directories if name not in SKIP_DIRS)
        if (current_path / ".git").exists():
            repository_roots.add(current_path)
    if root not in repository_roots and (root / ".git").exists():
        repository_roots.add(root)
    if not repository_roots:
        print(f"No Git repositories found under {root}", file=sys.stderr)
        return 1

    summary_lines = [f"# Workspace map: {root}", ""]
    for repository in sorted(repository_roots):
        files = tracked_files(repository)
        extensions = Counter(path.suffix.lower() or "(no extension)" for path in files)
        leaders = ", ".join(f"{ext} {count}" for ext, count in extensions.most_common(4))
        relative = repository.relative_to(root).as_posix() or "."
        summary_lines.append(f"- {relative}: {len(files)} files; {leaders or 'no supported files'}")
    summary_lines.extend(["", f"Repositories: {len(repository_roots)}"])

    if args.output_dir:
        output_directory = require_external_output(root, Path(args.output_dir))
        output_directory.mkdir(parents=True, exist_ok=True)
        for repository in sorted(repository_roots):
            filename = re.sub(r"[^A-Za-z0-9._-]+", "-", repository.name).strip("-").lower()
            map_path = output_directory / f"{filename or 'repository'}.md"
            map_path.write_text(format_repository_map(repository, 12) + "\n", encoding="utf-8")
            relative = repository.relative_to(root).as_posix() or "."
            summary_lines.append(f"- Detailed map: [{relative}]({map_path.name})")
        index_path = output_directory / "workspace-map.md"
        index_path.write_text("\n".join(summary_lines) + "\n", encoding="utf-8")
        print(f"Wrote {len(repository_roots)} repository maps and workspace index to {output_directory}")
    else:
        print("\n".join(summary_lines))
    return 0


def command_search(args: argparse.Namespace) -> int:
    root = normalized_root(args.root)
    needle = args.query.casefold()
    if not needle:
        raise ValueError("search query must not be empty")
    matches: list[tuple[Path, int, str]] = []
    truncated = False
    for relative in tracked_files(root):
        file_path = root / relative
        for line_number, line in enumerate(read_text(file_path).splitlines(), start=1):
            if needle in line.casefold():
                excerpt = line.strip()
                if len(excerpt) > args.max_chars:
                    excerpt = (
                        excerpt[: args.max_chars - 3] + "..."
                        if args.max_chars >= 3
                        else "." * args.max_chars
                    )
                matches.append((relative, line_number, excerpt))
                if len(matches) > args.limit:
                    truncated = True
                    break
        if truncated:
            break

    if not matches:
        print(f"No matches for {args.query!r}.")
        return 0
    for path, line_number, excerpt in matches[: args.limit]:
        print(f"{relative_display(path)}:{line_number}: {excerpt}")
    if truncated:
        print(f"Result limit reached ({args.limit}); narrow the query or raise --limit.")
    return 0


def resolve_module(root: Path, module: str, current_file: Path) -> Path | None:
    if module.startswith("."):
        if module.lower().endswith(RESOLVABLE_EXTENSIONS):
            base = current_file.parent / module
        else:
            level = len(module) - len(module.lstrip("."))
            base = current_file.parent
            for _ in range(max(0, level - 1)):
                base = base.parent
            remainder = module[level:].lstrip("/").replace(".", "/")
            if remainder:
                base /= remainder
    else:
        base = root / Path(module.replace(".", "/"))
    candidates = [base]
    candidates.extend(Path(str(base) + extension) for extension in RESOLVABLE_EXTENSIONS)
    candidates.extend(base / f"index{extension}" for extension in RESOLVABLE_EXTENSIONS[:4])
    candidates.append(base / "__init__.py")
    for candidate in candidates:
        try:
            resolved = (root / candidate).resolve()
            if resolved.is_file():
                return resolved.relative_to(root)
        except (OSError, ValueError):
            continue
    return None


def build_namespace_index(root: Path, files: list[Path]) -> dict[str, Path]:
    namespaces: dict[str, Path] = {}
    namespace_pattern = re.compile(r"^\s*namespace\s+([\w.]+)\s*[;{]", re.MULTILINE)
    for relative in files:
        if relative.suffix.lower() != ".cs":
            continue
        match = namespace_pattern.search(read_text(root / relative))
        if match:
            namespaces[match.group(1)] = relative
    return namespaces


def imports_for_file(
    root: Path,
    relative: Path,
    files: list[Path],
    namespaces: dict[str, Path],
) -> list[tuple[Path, str]]:
    text = read_text(root / relative)
    edges: dict[Path, str] = {}

    if relative.suffix.lower() in {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}:
        pattern = re.compile(
            r"""(?:\bfrom\s*|\bimport\s*\()\s*["']([^"']+)["']|^\s*import\s*["']([^"']+)["']""",
            re.MULTILINE,
        )
        for match in pattern.finditer(text):
            module = next(group for group in match.groups() if group is not None)
            if not module.startswith("."):
                continue
            target = resolve_module(root, module, relative)
            if target in files and target != relative:
                edges[target] = module

    elif relative.suffix.lower() == ".py":
        for match in re.finditer(r"^\s*(?:from|import)\s+([\w.]+)", text, re.MULTILINE):
            module = match.group(1)
            target = resolve_module(root, module, relative)
            if target in files and target != relative:
                edges[target] = module

    elif relative.suffix.lower() == ".cs":
        for match in re.finditer(r"^\s*using\s+(?:static\s+)?([\w.]+)\s*;", text, re.MULTILINE):
            namespace = match.group(1)
            target = namespaces.get(namespace)
            if target and target != relative:
                edges[target] = namespace

    if relative.suffix.lower() in {".cs", ".csproj"}:
        project_pattern = re.compile(r'<ProjectReference\s+Include="([^"]+)"')
        for match in project_pattern.finditer(text):
            target = (relative.parent / match.group(1).replace("\\", "/")).resolve()
            try:
                target = target.relative_to(root)
            except ValueError:
                continue
            if target in files and target != relative:
                edges[target] = match.group(1)

    return sorted(edges.items(), key=lambda edge: edge[0].as_posix().lower())


def resolve_input_file(root: Path, value: str, files: list[Path]) -> Path:
    candidate = Path(value)
    if candidate.is_absolute():
        try:
            candidate = candidate.resolve().relative_to(root)
        except ValueError as error:
            raise ValueError(f"File must be inside the repository root: {value}") from error
    else:
        candidate = Path(os.path.normpath(str(candidate)))
    if candidate not in files:
        raise ValueError(f"File was not found or is not indexed: {value}")
    return candidate


def command_deps(args: argparse.Namespace) -> int:
    root = normalized_root(args.root)
    files = tracked_files(root)
    relative = resolve_input_file(root, args.file, files)
    namespaces = build_namespace_index(root, files)
    dependencies = imports_for_file(root, relative, files, namespaces)
    print(f"Direct dependencies for {relative_display(relative)} ({len(dependencies)} resolved):")
    for target, reason in dependencies[: args.limit]:
        print(f"- {relative_display(target)} [{reason}]")
    if not dependencies:
        print("- No local imports resolved; check language support or use language-server references.")
    if len(dependencies) > args.limit:
        print(f"- ... {len(dependencies) - args.limit} more")
    return 0


def command_dependents(args: argparse.Namespace) -> int:
    root = normalized_root(args.root)
    files = tracked_files(root)
    target = resolve_input_file(root, args.file, files)
    namespaces = build_namespace_index(root, files)
    dependents: list[tuple[Path, str]] = []
    for candidate in files:
        if candidate == target:
            continue
        for dependency, reason in imports_for_file(root, candidate, files, namespaces):
            if dependency == target:
                dependents.append((candidate, reason))
                break

    print(f"Direct dependents of {relative_display(target)} ({len(dependents)} found):")
    for path, reason in dependents[: args.limit]:
        print(f"- {relative_display(path)} [{reason}]")
    if not dependents:
        print("- No direct dependents resolved; use language-server references for authoritative results.")
    if len(dependents) > args.limit:
        print(f"- ... {len(dependents) - args.limit} more")
    return 0


def positive_int(value: str) -> int:
    number = int(value)
    if number <= 0:
        raise argparse.ArgumentTypeError("must be a positive integer")
    return number


def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    map_parser = subparsers.add_parser("map", help="summarize one repository without printing source")
    map_parser.add_argument("--root", default=".", help="repository root (default: current directory)")
    map_parser.add_argument("--limit", type=positive_int, default=12, help="items per section")
    map_parser.add_argument("--output", help="optional Markdown report path")
    map_parser.set_defaults(handler=command_map)

    workspace_parser = subparsers.add_parser("workspace", help="summarize nested Git repositories")
    workspace_parser.add_argument("--root", default=".", help="workspace root (default: current directory)")
    workspace_parser.add_argument(
        "--output-dir",
        help="optional directory for one map per Git repository plus workspace-map.md",
    )
    workspace_parser.set_defaults(handler=command_workspace)

    search_parser = subparsers.add_parser("search", help="find literal text in indexed text files")
    search_parser.add_argument("--root", default=".", help="repository root")
    search_parser.add_argument("--query", required=True, help="literal, case-insensitive text")
    search_parser.add_argument("--limit", type=positive_int, default=20, help="maximum matching lines")
    search_parser.add_argument("--max-chars", type=positive_int, default=220, help="maximum excerpt length")
    search_parser.set_defaults(handler=command_search)

    for command_name, help_text, handler in (
        ("deps", "show resolved direct imports for one file", command_deps),
        ("dependents", "show files with resolved imports of one file", command_dependents),
    ):
        command_parser = subparsers.add_parser(command_name, help=help_text)
        command_parser.add_argument("--root", default=".", help="repository root")
        command_parser.add_argument("--file", required=True, help="repository-relative source path")
        command_parser.add_argument("--limit", type=positive_int, default=30, help="maximum relationships")
        command_parser.set_defaults(handler=handler)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = create_parser()
    args = parser.parse_args(argv)
    try:
        return args.handler(args)
    except ValueError as error:
        print(f"error: {error}", file=sys.stderr)
        return 2
    except OSError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
