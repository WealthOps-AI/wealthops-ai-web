# Repository map workflow

For every repository exploration or implementation request, identify the active repository or repositories and check the persistent map cache before reading source files.

- For this repository, check `graphify-out/graph.json` before source exploration. Query relevant nodes with `graphify query "<specific question>" --budget 1500`; do not load the full graph into context.
- If the graph is missing, build the initial local code graph with `graphify extract . --code-only`. If it is stale after source changes, run `graphify check-update .` and refresh with `graphify update .`.
- If the Graphify CLI is unavailable, say so and use the cached map fallback; do not claim the graph was queried.
- For cross-repository work, identify the owning repositories and query only their graphs. Use `../agent-cache/workspace/` for local-only combined artifacts; never commit the workspace cache.
- Verify graph evidence against source and tests. Graphs may miss framework behavior, reflection, generated code, or unresolved relationships.
- Review generated `graphify-out/` changes and commit the graph with relevant source changes; never commit `graphify-out/cache/` or `cost.json`.
- Regenerate only when missing, clearly stale after structural changes, or explicitly requested. Confirm current behavior against source and tests.
- If the skill or generator is unavailable, report that; do not claim a map was checked or generated.
