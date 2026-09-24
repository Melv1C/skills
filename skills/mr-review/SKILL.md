---
name: mr-review
description: >
  Review one GitLab merge request, one GitHub pull request, or a list of them.
  Use this skill whenever the user wants a code review, pastes one or more
  MR/PR URLs, mentions stacked or related merge requests, "review these",
  "the four MR list", or sends review links with no extra context. Trigger even
  when they do not name the skill. Do not use it to create or update an MR/PR,
  to implement a fix, or to reply to an existing discussion unless the task is
  still a review of the change.
---

# Review a merge request or pull request

Review the change, not the author. Inspect the diff, validate the behavior that matters, and publish only concrete findings that the author can act on.

## Contract

The request contains one GitLab merge-request URL, one GitHub pull-request URL, or several. Recover URLs from the current conversation when the user points at a list already given ("those MRs", "the four MR list") and none are in this message. If nothing parseable remains, ask for valid URLs.

Do not modify the existing checkout, create commits, push branches, approve, merge, submit a platform review object, or land a fix — including when CI is red. Report that failure as a finding on the request that introduced it.

The permitted external writes are comments on the reviewed requests: one comment per finding, or one non-resolvable comment when that request produced no findings.

## List handling

Parse every URL before talking to a provider. An unparseable or closed item does not cancel the rest.

1. Build the full set of targets (provider, host, project path, IID/number, complete URL).
2. Fetch metadata for every parseable URL. If that fails with Forbidden or a sandbox/network error, retry once with unrestricted network for that host. Only then run the host-specific auth check. Record a compact failure for that item and continue.
3. Group surviving open requests by `(host, project path)`. Clone that repository once. Fetch every source and target branch for the group in one `git fetch`, then review each request against **its own** target.
4. After every item has either publications or a compact failure, write a short chat recap grouped by request. Then remove the temporary clones.

Independent requests (their target is not another listed source) can be reviewed in any order. When one listed source is another's target, that is a stack: review from the base of the stack toward the tip so parent context is available, and keep each finding on the request whose slice introduced it.

A child reviewed against `main` (or against the workspace) will show parent commits as if they were new. That is why the declared target matters more than the default branch.

## Workflow

### 1. Establish the target

Parse each URL before running provider commands:

- provider and host;
- repository path;
- MR IID or PR number;
- complete review URL.

If a single URL is not a standard GitLab MR or GitHub PR URL, ask for a valid URL. In a list, record a compact failure for that item and continue.

Always target the repository from the URL. Do not infer it from the current directory, current Git remote, or an environment variable. Review from the clone you just pinned and from this request's description — another working tree, an earlier review comment, or files left from a previous session are not this change.

For GitLab, use the full repository URL explicitly:

    glab mr view <iid> -R "https://<host>/<project-path>" --output json
    glab repo view -R "https://<host>/<project-path>" --output json

For GitHub, use the PR URL:

    gh pr view '<url>' --json number,state,title,url,baseRefName,headRefName,headRefOid,headRepository

Read the title, description, state, source and target branches, head SHA, repository clone URLs, and linked requirements when available. Skip an item that is inaccessible or not open, with a compact failure, and continue the list. A one-item request that is inaccessible or not open stops the workflow.

When GitLab metadata fails with Forbidden or a sandbox/network error, retry once with unrestricted network for that host. Only then run glab auth status --hostname <host>. Report an authentication failure only when that targeted check fails; otherwise report the metadata failure as-is. Apply the equivalent provider-specific distinction for GitHub.

### 2. Check out and pin the change

Clone into a temporary directory, using metadata-provided clone URLs. Try SSH first and HTTPS second, recording both errors if both fail. Do not alter Git configuration. Reuse that clone for every request in the same `(host, project path)` group.

Fetch every source and target ref the group needs in one call, then compare **this request's** source with **this request's** target at their merge-base:

    git fetch origin <target-1> <source-1> <target-2> <source-2> ...
    git merge-base "origin/<target-branch>" "origin/<source-branch>"
    git diff "<merge-base-sha>" "origin/<source-branch>"
    git log --oneline "<merge-base-sha>..origin/<source-branch>"

Use the platform-reported head SHA to confirm that the reviewed source is current. If the target ref, checkout, fetch, or comparison cannot be resolved, record a compact failure for that item. In a list, continue with the requests that can still be pinned.

### 3. Review the change

Read the complete diff and enough surrounding code, callers, tests, and repository guidance to validate changed behavior. Use the MR/PR description and linked issue as the specification when available. Check the narrowest useful tests, type checks, linters, builds, or reproduction scripts; distinguish failures caused by the change from baseline or environment failures.

A command that this change claims will regenerate or compile is worth running when it is cheap. Package managers do not treat those strings the same way: `bun <name>` looks up a script named `<name>`, while `bunx <name>` runs a dependency binary. Committed generated files let CI stay green while `generate:*` is broken. The same idea applies to `npm run` vs `npx`, and to turbo tasks that wrap those scripts.

When this slice introduces or rewires a process-wide SDK or HTTP client, follow `baseURL`, auth, cache, and retries into the callers that share that instance. A parsed config default is not the constructor argument: if `defineSdk` / the HTTP client never receives `baseURL`, the library may read a different `process.env` host (or a host without the API path). A per-call cache skip does not drop an existing GET TTL on that shared store, so a later GET can still return the pre-mutation body. Either belongs here if the wiring is in this slice.

Use one focused defect-first pass. Trace changed behavior through the paths it affects, especially input validation, authorization, persistence, side effects, errors, retries, async ordering, cleanup, compatibility, and serialization. Follow a boundary only when the diff touches or could plausibly break it.

On a stack, a finding belongs on the child only when the failing line is in that child's slice versus its declared target. Parent behavior that the child merely consumes is reviewed on the parent.

Report a finding only when all of these are true:

- it is introduced by this change;
- it is a real correctness, security, performance, or maintainability problem;
- a realistic execution path demonstrates why it matters;
- the location and evidence are precise enough for the author to verify it;
- the author can take a specific corrective direction.

Prefer evidence you ran or traced (the command that exits 1, the constructor call that omits `baseURL`) over "looks consistent." Skip style preferences, naming opinions, speculative risks, and refactoring suggestions without an observable consequence. Do not invent findings when the evidence is insufficient.

Assign each finding one priority:

- blocker: release-blocking or critical failure;
- major: urgent defect with meaningful user, data, security, or operational impact;
- minor: real but limited-impact defect.
- improvement: a suggestion for a better way to do something.

For each finding, capture:

- priority;
- source-branch file path and exact changed line or range;
- short title;
- failure path and impact;
- supporting requirement, contract, test result, or minimal code trace;
- smallest corrective direction.

### 4. Publish findings

Read and follow `mr-communication` skill for every publication. It owns the attribution header, active model identity, provider commands, inline location data, deduplication, and delivery semantics.

Publish on the request that owns the finding. Never post one comment that covers several MRs/PRs, and never attach a child's finding to a parent (or the reverse) because they were reviewed in the same session.

If there are findings, publish one message per finding. Give mr-communication the structured path and line/range, not only a location in prose. Use an inline diff discussion/comment when the location is on the changed source branch. Publish an unanchored top-level note only when the issue is genuinely file-independent. Never silently turn a requested inline report into a global note.

Finding bodies should be concise:

    <priority>: <short title>

    <What breaks, when it breaks, and why it matters.>

    Evidence: <requirement, contract, check, or minimal trace.>

    Suggested direction: <smallest corrective direction.>

Those finding messages are the complete publication set for that request.

If there are no findings, publish one global non-resolvable comment through mr-communication to indicate that the review produced no findings.

Do not claim completion until every required publication has been accepted by the platform, or until every remaining list item has a compact failure instead.

### 5. Recap and clean up

Recap in stack order (base of each stack toward the tip), then independents, then compact failures. For each request, a heading like `!52 — <title>` (GitHub: `#N — <title>`), then the URL, then `source → target`, then finding titles by priority or "no findings." No merge-base SHAs and no restating the diff — the recap is an index.

Remove the temporary clones after the recap, once publications are accepted or remaining failures are recorded. If cleanup fails, report the path so it can be removed manually.

## Failure report

Use this compact shape whenever one item or the whole workflow stops:

    Review failed.

    Attempted flow:
    1. <operation>: succeeded.
    2. <operation>: failed.
       Error: <sanitized exact CLI error>
    3. <next operation>: not attempted because <reason>.

In a list, prefix the report with the URL or IID of the item it belongs to. Never claim that authentication, checkout, cloning, validation, or publication failed unless it was actually attempted and its output supports that claim.
