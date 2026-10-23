# Agents and budget
- Spend about 14% of the daily token budget at most, with one agent running at a time. Why: the budget is shared and parallel agents multiplied burn. Guard: none.
- Opus orchestrates; workers are Sonnet with a pinned effort and a restricted tool list (agents/*.md). Why: cheap, predictable workers. Guard: scripts/guard.sh checks the agent frontmatter.
- One agent per repo checkout; agents work on oci-apps, not termux. Why: concurrent edits in one tree collide. Guard: none.
- Brief every agent with the session-survival rules: one build at a time, disk worktrees, push WIP early, no glob deletes, no pkill -f. Why: agents do not inherit this context. Guard: hooks apply to agents too.
- Agents never commit or push unless the task says so; the commit trailer is the one given in the task. Why: the orchestrator owns history. Guard: none.
- Lean agents: build (edit + build), explore (read-only), ops (CI/fleet status), review (refute claims), general-purpose (override with fleet MCPs only). Why: each connected tool costs context. Guard: guard.sh.
