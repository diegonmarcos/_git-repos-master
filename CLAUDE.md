# Claude Code project instructions

**Owner rules:** the `c3-infra` plugin (repo `diegonmarcos/c3-infra-plugin`) is the single home for all owner rules: skill `c3-infra` and its `rules/*.md`, guard hooks, lean agents. It is declared in `.claude/settings.json` and mirrored into `.claude/skills/c3-infra`, `.claude/agents` and `.claude/hooks/c3` for cloud sessions (they do not install plugins). Read `.claude/skills/c3-infra/SKILL.md` before acting; it applies to every session and agent.

@.claude/SESSION-SURVIVAL.md

Tickets ("New task"): see `.claude/skills/c3-infra/rules/backlog.md`.
