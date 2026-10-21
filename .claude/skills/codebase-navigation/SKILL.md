---
name: codebase-navigation
description: "Use when exploring a codebase, querying its persistent Graphify knowledge graph, locating symbols/configuration, or tracing imports. Retrieve only the relevant graph neighborhood and bounded source files."
argument-hint: "What code area, symbol, or behavior should be traced?"
user-invocable: true
disable-model-invocation: false
---

# Codebase Navigation

Use this skill to keep repository exploration selective. Do not dump a repository tree, full graph, or large source files into context.

## Workflow

1. Identify the repository root from the current task. If working in a workspace with nested Git repositories, run the bundled `scripts/code_map.py workspace --root <workspace-root>`.
2. If a `references/codebases/` profile is bundled, read only the profile for the target repository. For a single-repository task, do not load the workspace profile.
3. In the backend and web pilot repositories, check `graphify-out/graph.json` first. If missing, build it with `graphify extract . --code-only`. If present, run `graphify check-update .`; use `graphify update .` only when source changes make it stale. If the Graphify CLI is unavailable, report that and use the compact map fallback instead.
4. Query the relevant graph with `graphify query "<specific question>" --budget 1500`. In platform, graph-only extraction did not yield useful queries; use the workspace `agent-cache/maps/wealthops-ai-platform.md` and bounded source inspection instead. For other repositories, reuse the matching workspace cache map, generating it with the bundled `scripts/code_map.py` only if absent or stale.
5. For cross-repository work, identify the owning repositories and query only the backend/web graphs or relevant maps. Do not load or merge every repository graph by default.
6. Inspect graph-referenced definitions and the closest relevant tests in source. A graph is a navigation aid, not proof of current behavior; verify important relationships in code and tests.
7. Use bounded search or the language server when the graph has no relevant edge, its evidence is ambiguous, or exact references are needed.
8. Stop expanding once the behavior and its validation path are established. Verify with focused tests/builds.

## Output and trust

- Keep exploration summaries to relevant paths, symbols, and short dependency paths.
- Graphify code-only extraction runs locally without an LLM. Its shared graph is committed under the repository's `graphify-out/`; local extraction caches and workspace-level derived data remain in ignored `agent-cache/`.
- The bundled map tool remains a local-only Python standard-library fallback for repositories outside the Graphify pilot.
- Import edges are best-effort for JavaScript/TypeScript, Python, and C# navigation, not a complete call graph. Other languages have map/search only. Use the language server/compiler for authoritative references and types.
- If the map misses untracked/ignored files, inspect the specific path directly. Do not treat an empty result as proof that a symbol is absent.

## Tool

The `scripts/code_map.py` file is bundled with this skill. Resolve it relative to the loaded skill, then run it with Python 3 and pass the target application repository via `--root`. Claude Code can resolve this resource from `${CLAUDE_SKILL_DIR}/scripts/code_map.py`. In this skills repository itself, the script forwards to the canonical implementation at `tools/code_map.py`.
