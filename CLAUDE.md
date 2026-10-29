# Claude Code project instructions

**Owner rules:** the `c3-infra` skill (SKILL.md, `rules/*.md`), guard hooks and lean agents have ONE source of truth: `diegonmarcos/cloud-u-linux`, `da_my-ai/data/claude/` (`cloud-marketplace/c3-infra`, `agents/`, `settings.project.json`). The old plugin repo `c3-infra-plugin` is archived (`z-archived_c3-infra-plugin`) and is not a source. Local sessions load the plugin via `enabledPlugins` in `.claude/settings.json`. This repo only holds generated mirrors (`_dotfiles/apps/src/claude`, `_dotfiles/apps/dist/dotfiles/claude`, `.claude/skills/c3-infra`, `.claude/agents`, `.claude/hooks/c3`, `.claude/settings.json`), because cloud sessions do not install plugins. Never edit a mirror: edit the source in cloud-u-linux, then regenerate with the my-ai dotfiles engine (`CLAUDE_SOT_DIR=<cloud-u-linux>/da_my-ai/data/claude sh <cloud-u-linux>/da_my-ai/engines/dotfiles/deploy-dotfiles.sh _dotfiles/apps/src _dotfiles/apps/dist/dotfiles .`; discard the unrelated `.mcp.json` change it makes) and verify with `da_my-ai/data/claude/test-claude-sot.sh`. Read `.claude/skills/c3-infra/SKILL.md` before acting; it applies to every session and agent.

@.claude/SESSION-SURVIVAL.md

Tickets ("New task"): see `.claude/skills/c3-infra/rules/backlog.md`.
