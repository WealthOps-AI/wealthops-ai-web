---
name: change-impact
description: "Use before changing code or contracts to query the Graphify knowledge graph for affected symbols, dependents, and focused tests without scanning the whole repository."
argument-hint: "Which file or behavior is changing?"
user-invocable: true
disable-model-invocation: false
---

# Change Impact

Trace only the dependency neighborhood needed to scope a change. Do not present the static import graph as a complete call graph.

## Workflow

1. In the backend and web pilot repositories, check `graphify-out/graph.json`. Build it with `graphify extract . --code-only` if missing; if present, check staleness with `graphify check-update .` and refresh with `graphify update .` when needed.
2. If a `references/codebases/` profile is bundled, read only the profile for the repository being changed.
3. In the backend/web pilot, use `graphify affected "<symbol-or-area>"` and `graphify query "<change and likely impact>" --budget 1500` to retrieve the relevant graph neighborhood.
4. In platform and repositories outside the pilot, use the bundled `scripts/code_map.py dependents` and `deps` commands for best-effort direct imports; platform's code-only graph did not return useful query results.
5. For every likely dependent, inspect its relevant call site and locate the nearest focused tests. Use language-server references for semantic/type-sensitive relationships.
6. Report confirmed dependents separately from uncertain or unresolved edges. After source edits in the pilot, run `graphify update .` and include reviewed graph changes in the same repository change.

## Limits

- Graphify code-only parsing is local and does not send code to a model. The graph may still contain source paths, labels, and derived content; review it under the same access controls as the source.
- Static graphs can miss dynamic dispatch, reflection, dependency injection, generated code, and framework conventions. Check these with the project's language tools and source.
- A missing edge is not proof that no runtime dependency exists.

## Tool

The `scripts/code_map.py` file is bundled with this skill. Resolve it relative to the loaded skill, run it with Python 3, and pass the target application repository through `--root`. In this skills repository, it forwards to the canonical implementation in `tools/code_map.py`.
