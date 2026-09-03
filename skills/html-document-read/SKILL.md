---
name: html-document-read
description: Use when the user provides a hosted HTML document URL from the skills API (api.skills.melvyn.be/d/...).
---

# HTML Document Read

Read the hosted HTML with the Skills CLI. Do not use web search or a browser.

URLs look like `https://api.skills.melvyn.be/d/:id` with optional `/v/:n`.

1. Remove a trailing slash.
2. Run `agent-tools document read '<url>'`.
3. Read the command output and continue the user's request from its contents.

If the CLI fails, report its actual status or network error. Do not substitute search results.
