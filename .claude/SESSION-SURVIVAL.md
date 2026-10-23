# Session survival rules

Moved to the c3-infra plugin: `.claude/skills/c3-infra/rules/session-survival.md`.
Short form: if every Bash call exits 1 with no output, retry once with `dangerouslyDisableSandbox: true` and check `df -h /`. Never `pkill -f`/`pgrep -f`, never glob-delete in /tmp or /dev/shm, one Gradle build at a time (CI only), work in disk worktrees and push WIP.
