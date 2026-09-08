---
name: mr-review
description: Use when the user wants to review a merge request or pull request. Or when receiving a merge request or pull request url without any context.
---

# Review a merge request or pull request

Review the change, not the author. Inspect the diff, validate the behavior that matters, and publish only concrete findings that the author can act on.

## Contract

The request contains a GitLab merge-request URL or GitHub pull-request URL. Do not modify the existing checkout, create commits, push branches, approve, merge, or submit a platform review object. The permitted external writes are one comment per finding, or one non-resolvable comment when the review produced no findings.

## Workflow

### 1. Establish the target

Parse the URL before running provider commands:

- provider and host;
- repository path;
- MR IID or PR number;
- complete review URL.

If it is not a standard GitLab MR or GitHub PR URL, ask for a valid URL.

Always target the repository from the URL. Do not infer it from the current directory, current Git remote, or an environment variable.

For GitLab, use the full repository URL explicitly:

    glab mr view <iid> -R "https://<host>/<project-path>" --output json
    glab repo view -R "https://<host>/<project-path>" --output json

For GitHub, use the PR URL:

    gh pr view '<url>' --json number,state,title,url,baseRefName,headRefName,headRefOid,headRepository

Read the title, description, state, source and target branches, head SHA, repository clone URLs, and linked requirements when available. Stop if the request is inaccessible or is not open.

When GitLab metadata fails, run glab auth status --hostname <host> for that host only. Report an authentication failure only when that targeted check fails; otherwise report the metadata failure as-is. Apply the equivalent provider-specific distinction for GitHub.

### 2. Check out and pin the change

Clone into a temporary directory, using metadata-provided clone URLs. Try SSH first and HTTPS second, recording both errors if both fail. Do not alter Git configuration.

After checkout, compare the source branch with the target branch at their merge-base:

    git fetch origin '<target-branch>' '<source-branch>'
    git merge-base "origin/<target-branch>" "origin/<source-branch>"
    git diff "<merge-base-sha>" "origin/<source-branch>"
    git log --oneline "<merge-base-sha>..origin/<source-branch>"

Use the platform-reported head SHA to confirm that the reviewed source is current. If the target ref, checkout, fetch, or comparison cannot be resolved, stop with the compact attempted-flow failure report.

### 3. Review the change

Read the complete diff and enough surrounding code, callers, tests, and repository guidance to validate changed behavior. Use the MR/PR description and linked issue as the specification when available. Check the narrowest useful tests, type checks, linters, builds, or reproduction scripts; distinguish failures caused by the change from baseline or environment failures.

Use one focused defect-first pass. Trace changed behavior through the paths it affects, especially input validation, authorization, persistence, side effects, errors, retries, async ordering, cleanup, compatibility, and serialization. Follow a boundary only when the diff touches or could plausibly break it.

Report a finding only when all of these are true:

- it is introduced by this change;
- it is a real correctness, security, performance, or maintainability problem;
- a realistic execution path demonstrates why it matters;
- the location and evidence are precise enough for the author to verify it;
- the author can take a specific corrective direction.

Skip style preferences, naming opinions, speculative risks, and refactoring suggestions without an observable consequence. Do not invent findings when the evidence is insufficient.

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

Read and follow skills/mr-communication/SKILL.md for every publication. It owns the attribution header, active model identity, provider commands, inline location data, deduplication, and delivery semantics. Do not reproduce or override those rules here.

If there are findings, publish one message per finding. Give mr-communication the structured path and line/range, not only a location in prose. Use an inline diff discussion/comment when the location is on the changed source branch. Publish an unanchored top-level note only when the issue is genuinely file-independent. Never silently turn a requested inline report into a global note.

Finding bodies should be concise:

    <priority>: <short title>

    <What breaks, when it breaks, and why it matters.>

    Evidence: <requirement, contract, check, or minimal trace.>

    Suggested direction: <smallest corrective direction.>

Those finding messages are the complete publication set.

If there are no findings, publish one global non-resolvable comment through mr-communication to indicate that the review produced no findings.

Do not claim completion until every required publication has been accepted by the platform.

### 5. Clean up

Remove the temporary clone after all publications are accepted, or after a hard failure once the repository is no longer needed. If cleanup fails, report the path so it can be removed manually.

## Failure report

Use this compact shape whenever the workflow stops:

    Review failed.

    Attempted flow:
    1. <operation>: succeeded.
    2. <operation>: failed.
       Error: <sanitized exact CLI error>
    3. <next operation>: not attempted because <reason>.

Never claim that authentication, checkout, cloning, validation, or publication failed unless it was actually attempted and its output supports that claim.
