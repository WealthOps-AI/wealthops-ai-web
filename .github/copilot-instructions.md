# Repository map workflow

For every repository exploration or implementation request, identify the active repository or repositories and check the persistent map cache before reading source files.

- For this repository, check `$HOME/.cache/wealthops-ai-agent-skills/maps/wealthops-ai-web.md`; if it exists, read and reuse it.
- For work across repositories, check `$HOME/.cache/wealthops-ai-agent-skills/workspace/workspace-map.md` and read only the maps for relevant repositories.
- If a required map is missing, use the installed `codebase-navigation` skill or the sibling `wealthops-ai-agent-skills/tools/code_map.py` utility to generate and save it in the cache, then read it before exploring source. Never write generated maps into this repository.
- Regenerate only when missing, clearly stale after structural changes, or explicitly requested. Confirm current behavior against source and tests.
- If the skill or generator is unavailable, report that; do not claim a map was checked or generated.
