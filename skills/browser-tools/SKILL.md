---
name: browser-tools
description: Use when you need to interact with a web page or browser.
---

# Browser Tools

Read this before picking a browser. Use the first tool that can do the job. If a rung is missing in this session, skip it.

If the user names a tool, use that tool.

## Order

1. **T3 Code preview** (`preview_open`, `preview_navigate`, `preview_snapshot`, `preview_click`, `preview_type`, `preview_press`, `preview_scroll`, `preview_wait_for`, `preview_evaluate`, `preview_resize`, `preview_set_appearance`, `preview_recording_start` / `preview_recording_stop`)
   Default for UI the human should see: click-through, snapshot, screenshot, record, local dev server.
2. **Playwright MCP** (`browser_*`)
   Capability preview lacks: network or console inspection, file upload, dialogs, drag/drop, multi-tab Playwright, WebMCP, or a hidden browser the human does not need to watch.
3. **Playwright CLI / repo tests** (`playwright-cli`, `npx playwright`, existing spec files)
   Committed tests, CI, codegen. For CLI mechanics, follow the `playwright-cli` skill.
4. **Bun.WebView** (`new Bun.WebView()`) - Requires Bun 1.4 or later.
   Headless automation inside a Bun script. Official API is `Bun.WebView`, not `bun:browser`. Headless-only. Default backend is WebKit on macOS; pass `backend: "chrome"` for Chromium/CDP.

Done when the session is on the highest tool that can finish the job, and you have started with it.

## Escalate

Stay on T3 Code preview for navigate, snapshot, click, type, press, scroll, wait, evaluate, resize, light/dark, and record.

Move to Playwright MCP only for a capability preview lacks, then return to preview for the rest of the session if you can.

Reach for Bun.WebView when a Bun script must drive a page with no extra tools — not to preview an app in this thread.
