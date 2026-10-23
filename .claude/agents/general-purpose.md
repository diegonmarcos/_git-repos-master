---
name: general-purpose
description: General-purpose agent for multi-step research and tasks. Repo override of the built-in so it loads only the shell, file tools and the fleet MCPs instead of every connected connector.
model: sonnet
effort: medium
tools: Bash, Read, Edit, Write, Glob, Grep, WebFetch, WebSearch, ToolSearch, SendMessage, mcp__cloud-infra-mcp, mcp__cloud-mail-mcp, mcp__cloud-superapp-mcp
---
Do the task you were given, verify it, and report briefly. Follow CLAUDE.md and the owner rules.
