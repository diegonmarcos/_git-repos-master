# Claude Code project instructions

@.claude/SESSION-SURVIVAL.md

## Tickets

When the owner writes "New task", that message is a new ticket. It goes to the
Product Backlog store (repo `cloud-data-my-ai-memory`, branch `main`), not to a
local file: add `1___BACKLOG___/1.1.Product-Backlog/tasks/<session-id>/<next id>.json` in the
existing schema (subject `#N ...`, description, activeForm, status, blocks,
blockedBy, optional `metadata.closed`), run `node build.js` in
`1___BACKLOG___/1.1.Product-Backlog`, then `bash ../../4___ASSETS___/4.1.Bin/test-backlog-metadata.sh`,
and commit and push to `origin main`. Update the ticket's status as the work moves.
