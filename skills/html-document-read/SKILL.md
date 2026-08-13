---
name: html-document-read
description: Use when the user provides a hosted HTML document URL from the skills API (api.skills.melvyn.be/d/...).
---

# HTML Document Read

Fetch the uploaded HTML with the shell. Do not use web search or a browser.

URLs look like `https://api.skills.melvyn.be/d/:id` with optional `/v/:n`.

1. Remove a trailing slash.
2. Run `curl --fail --silent --show-error --location --max-time 30 --output /tmp/document.html '<url>'`.
3. Read `/tmp/document.html` and continue the user's request from its contents.

If `curl` fails, report its actual status or network error. Do not substitute search results.
