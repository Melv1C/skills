---
name: ai-review
description: Use when the user asks to review an MR, PR, merge request, or pull request link.
---

# AI Review

## When to Use

Use this skill when the user asks to review an MR or PR and provides (or names) a merge-request or pull-request URL.

Do not post review comments on the MR unless the user explicitly asks. Default output is a published HTML report of proposed comments.

## Related Skills

- Read and follow `skills/html-communication/SKILL.md` for the HTML artifact and Postplan upload.
- Apply the defect-first review standards from the review-agent skill: concrete, actionable findings only; no style nits or speculation.

## Tooling

Use shell and git for clone and diff. Use provider CLIs for metadata:

| Provider | Detect | Metadata CLI |
|----------|--------|--------------|
| GitHub | `github.com` or `github.` host with `/pull/` | `gh pr view` |
| GitLab | `/merge_requests/` or `/-/merge_requests/` | `glab mr view` + `glab repo view` |

Do not use a browser or web search to read the MR.

If the matching CLI is missing, tell the user to install `gh` (GitHub) or `glab` (GitLab).

## Workflow

Run these steps in order. Request `all` permissions for clone, fetch, diff, and cleanup under `/tmp`.

### 1. Parse the URL

From the pasted link, extract:

- **Provider** (GitHub vs GitLab) from host and path shape.
- **Host** (for self-managed GitLab or GitHub Enterprise).
- **Repo path** (`owner/repo` or `group/subgroup/project`).
- **MR/PR number** (GitLab `iid` from `merge_requests/<n>`, GitHub from `pull/<n>`).

If the URL cannot be parsed, ask the user for a standard MR/PR web URL.

### 2. Load MR metadata

**GitHub**

```bash
gh pr view '<url>' --json number,title,url,baseRefName,headRefName,headRepository
```

Use `headRepository.nameWithOwner` and `headRepository.sshUrl` / `headRepository.url` for clone URLs.

For GitHub Enterprise, pass `--hostname <host>` when needed.

**GitLab**

```bash
glab mr view <iid> -R '<host>/<repo-path>' --hostname <host> -F json
glab repo view -R '<host>/<repo-path>' --hostname <host> -F json
```

Read `source_branch`, `target_branch`, `title`, `web_url` from the MR. Read `ssh_url_to_repo` and `http_url_to_repo` (or `web_url` + `.git`) from the repo.

Use `--hostname` for non-`gitlab.com` GitLab instances.

If metadata fetch fails with an auth error, ask the user to run `gh auth login` or `glab auth login`, then retry.

### 3. Clone into a temp directory

```bash
CLONE_DIR=$(mktemp -d /tmp/ai-review-XXXXXX)
```

Clone with **SSH first**, then **HTTPS** if SSH fails:

```bash
git clone '<ssh-url>' "$CLONE_DIR/repo"
```

On failure:

```bash
git clone '<https-url>' "$CLONE_DIR/repo"
```

Report which transport succeeded. Do not update git config.

### 4. Fetch branches and diff

```bash
cd "$CLONE_DIR/repo"
git fetch origin '<target-branch>' '<source-branch>'
```

Compare what would merge, not a naive tip-to-tip diff against the wrong ref:

```bash
git merge-base "origin/<target-branch>" "origin/<source-branch>"
git diff "<merge-base-sha>" "origin/<source-branch>"
git log --oneline "<merge-base-sha>..origin/<source-branch>"
```

Read changed files and enough surrounding context to validate each finding. Check tests and call sites when relevant.

### 5. Review

Inspect the full diff. Flag an issue only when it is:

- A real correctness, security, performance, or maintainability problem.
- Introduced by this change.
- Actionable and demonstrable from the code.
- Something the author would likely fix.

Use priorities:

- **P0**: release blocker or critical failure.
- **P1**: urgent defect.
- **P2**: ordinary defect.
- **P3**: low impact but worth fixing.

If there are no qualifying findings, say so in the report. Do not invent issues.

For each finding, draft a **ready-to-paste MR comment**: short title, one paragraph on the problem, and file path with line number(s) from the **source branch** version of the file.

### 6. Write and publish HTML

Use the html-communication skill to write one self-contained HTML file.

Include:

- MR title, URL, provider, source branch, target branch.
- Brief overall assessment and test gaps.
- A scannable list of proposed comments, each with priority, `path:line`, title, and full comment body (copy-paste ready).
- Link back to the MR URL.

Upload with Postplan as required by html-communication. Report the local path and Postplan URL.

Do not include secrets, tokens, or the temp clone path in the published HTML.

### 7. Delete the clone

Always remove the temp clone after the HTML is written and uploaded (or after a hard failure once you are done with the repo):

```bash
rm -rf "$CLONE_DIR"
```

Confirm cleanup in your reply. If cleanup fails, report the path so the user can remove it.

## Errors

- **Clone fails on both SSH and HTTPS**: Report both errors. Stop without fabricating a review.
- **Fetch or diff fails**: Report the git error. Clean up the clone.
- **Provider CLI fails**: Report the actual CLI output. Do not substitute search results or guess branch names.
- **Postplan upload fails**: Fix HTML per html-communication validation rules and retry. Keep the clone only if you still need it for fixes; otherwise delete it once work is finished.

## Optional: post comments

Only when the user explicitly asks to post comments on the MR:

- GitHub: `gh pr review` / `gh api` for inline comments.
- GitLab: `glab mr note` or API for discussions.

Default remains HTML-only proposed comments.
