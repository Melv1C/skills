---
name: babysit-pr
description: Monitor a pull request or merge request through review and CI. Use when the user asks to monitor, watch, or babysit a PR or MR.
---

# Babysit PR

All the repos we work in have various AI review bots. They're helpful, even if they are not always right.

If your runtime offers tools to monitor a PR or MR, use them so you can respond when comments arrive. Otherwise, poll the PR or MR for new comments and checks.

Only act on checks and comments newer than the latest push. Verify every bot finding against the source before changing code. Fix real findings and CI failures, distinguish repository failures from infrastructure flakes, and reply with a written reason when dismissing false positives.

Keep an eye on changes to `main` and rebase when needed. If an overlapping PR or MR makes this one obsolete, stop monitoring, report it to the user, and ask before closing it unless closure was explicitly authorized.

If a review bot leaves feedback you believe is not worth addressing, reply with a written reason and resolve the comment. Use the `mr-communication` skill for every comment posted on the user's behalf.

Screenshots and videos help as well. Use the `asset-upload` skill when needed.

Do not let review feedback expand the PR or MR beyond the user's original goal. Address real shortcomings, but avoid scope creep.

If nothing has changed, stay quiet rather than posting filler comments. Stop when the review bots and required checks are green on the latest commit. Merge only when the user explicitly requested it, otherwise report that the PR or MR is ready.
