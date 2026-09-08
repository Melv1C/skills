---
name: mr-communication
description: Use when you need to publish a comment or reply on a GitLab merge request or GitHub pull request.
---

# Communicate on a merge request or pull request

Use this skill whenever you need to publish a comment or reply on a GitLab merge request or GitHub pull request. Detect the provider from the URL, use its CLI/API, and preserve the exact meaning of the requested message. Do not approve, merge, close, edit unrelated comments, or make repository changes unless the user explicitly asks for that separate action. Do not expose credentials, raw API responses, or command transcripts.

## Invariant

Every published comment or reply must start with this header:

```text
> [!NOTE]
> 🤖 **Responded by <MODEL>**

```

Replace `<MODEL>` with the active model name exposed by the runtime.

The attribution header is mandatory for every publication, including short acknowledgements and replies.

### Model identity requirements

`MODEL` is mandatory.

Before publication:

- `MODEL` MUST be non-empty.
- Use the active model name exposed by the runtime.
- Do not guess, normalize, shorten, or invent the model name.
- Do not substitute `unknown`.
- If the model identity cannot be resolved, stop before publication and report the identity lookup failure.

For optional dynamic fields other than `MODEL`, use `unknown` or omit the affected sentence when appropriate.

## Message construction

Before sending, inspect the composed body as text and verify:

1. The first line is exactly `> [!NOTE]`.
2. The second line is exactly `> 🤖 **Responded by <MODEL>**` after substitution.
3. The actual model name is present and non-empty.
4. Exactly one blank line follows the attribution header before the requested content.
5. No required dynamic field is empty.
6. Markdown markers and intended blank lines are preserved.

## GitLab publication

Use `glab` for merge request comments and discussions.

Always target the intended repository explicitly with `-R/--repo` when repository context is not guaranteed.

For self-hosted GitLab, use the target host consistently for host-aware API commands.

### Comment on a particular line

Use `glab mr note create` with `--file` and `--line`.

```sh id="3wc7hq"
glab mr note create <mr> \
  -R "https://<host>/<project-path>" \
  --file <path> \
  --line <line> \
  --message-file <message-file>
```

Example:

```sh id="c67jfc"
glab mr note create 123 \
  -R "https://gitlab.example.com/group/project" \
  --file src/main.go \
  --line 42 \
  --message-file /tmp/comment.md
```

For a multiline range:

```sh id="rhdvsl"
glab mr note create <mr> \
  -R "<repository-url>" \
  --file <path> \
  --line <start>:<end> \
  --message-file <message-file>
```

For a removed line, use `--old-line` instead:

```sh id="k8odv5"
glab mr note create <mr> \
  -R "<repository-url>" \
  --file <path> \
  --old-line <line> \
  --message-file <message-file>
```

`--file` targets the latest merge request diff version.

Use:

- `--line N` for a line in the new version.
- `--line A:B` for a multiline range in the new version.
- `--old-line N` for a removed line.

Do not silently replace a requested line comment with a top-level note if the line cannot be addressed. Report the failure instead.

### Reply to an existing comment thread

GitLab replies belong to discussions.

First list the merge request notes/discussions and obtain the discussion ID:

```sh id="iyig9u"
glab mr note list <mr> \
  -R "<repository-url>" \
  -F json
```

Then reply with:

```sh id="xf5zpj"
glab mr note create <mr> \
  -R "<repository-url>" \
  --reply <discussion-id> \
  --message-file <message-file>
```

`--reply` accepts either:

- the full discussion ID, or
- a unique prefix of at least 8 characters.

Before replying, verify that the discussion belongs to the requested merge request.

Do not create a new top-level discussion if the requested reply target cannot be resolved.

### Post a global non-resolvable comment

Use a non-resolvable note for review summaries, automation/status messages, or other global comments that should not create a resolution requirement.

```sh id="zzshcn"
glab mr note create <mr> \
  -R "<repository-url>" \
  --resolvable=false \
  --message-file <message-file>
```

This is the preferred GitLab operation for a global review summary.

Do not omit `--resolvable=false` when the caller explicitly requests a global non-resolvable comment.

## GitHub publication

Use `gh pr comment` for global pull request comments.

Use `gh api` for line-specific review comments and replies to existing review comments.

Resolve the repository owner, repository name, pull request number, and current head commit before creating line comments.

### Comment on a particular line

Create a pull request review comment through the review-comments API:

```sh id="gcrw5v"
gh api \
  --method POST \
  "repos/<owner>/<repo>/pulls/<pr-number>/comments" \
  --input <request-file>
```

Build the request as JSON.

For a single line in the new/right side of the diff:

```json id="0rk65o"
{
  "body": "<comment body>",
  "commit_id": "<pull-request-head-sha>",
  "path": "src/main.go",
  "line": 42,
  "side": "RIGHT"
}
```

For a removed line:

```json id="act8ds"
{
  "body": "<comment body>",
  "commit_id": "<pull-request-head-sha>",
  "path": "src/main.go",
  "line": 42,
  "side": "LEFT"
}
```

For a multiline comment:

```json id="gnz4vf"
{
  "body": "<comment body>",
  "commit_id": "<pull-request-head-sha>",
  "path": "src/main.go",
  "start_line": 40,
  "start_side": "RIGHT",
  "line": 45,
  "side": "RIGHT"
}
```

Use:

- `RIGHT` for added lines and context lines on the new side.
- `LEFT` for removed lines on the old side.
- `line` for the final or only line.
- `start_line` and `start_side` for a multiline range.

Use the pull request's current head SHA as `commit_id`.

Do not use the legacy `position` field when `line` and `side` can be used.

Before publication, verify that the requested path and line are represented in the pull request diff.

If GitHub rejects the position, report the sanitized API error and do not silently create a global comment instead.

### Reply to an existing line/review comment

Replies to GitHub review comments use the dedicated reply endpoint.

First resolve the numeric review comment ID and verify that it belongs to the requested pull request.

Then use:

```sh id="r3qg7p"
gh api \
  --method POST \
  "repos/<owner>/<repo>/pulls/<pr-number>/comments/<comment-id>/replies" \
  --input <request-file>
```

Request body:

```json id="fl9tc2"
{
  "body": "<reply body>"
}
```

A reply does not need file, line, side, or commit information. It inherits the review thread from the parent comment.

Do not create a new review comment if the requested parent comment cannot be found.

### Post a global pull request comment

Use:

```sh id="7id2z5"
gh pr comment <pr> \
  -R "<host>/<owner>/<repo>" \
  --body-file <message-file>
```

For `github.com`, the repository may be written as:

```sh id="0w2u13"
gh pr comment <pr> \
  -R "<owner>/<repo>" \
  --body-file <message-file>
```

This creates a normal pull request timeline comment rather than a line-specific review comment.

GitHub does not have the same resolvable/non-resolvable distinction as GitLab merge request discussions. Treat a normal `gh pr comment` as the GitHub equivalent of a global non-resolvable communication message.

## Publication mapping

Use the publication type requested by the caller:

| Intent                       | GitLab                                          | GitHub                                        |
| ---------------------------- | ----------------------------------------------- | --------------------------------------------- |
| Particular line              | `glab mr note create --file ... --line ...`     | `gh api POST repos/.../pulls/.../comments`    |
| Removed line                 | `glab mr note create --file ... --old-line ...` | Review comment with `"side": "LEFT"`          |
| Multiline range              | `--line START:END`                              | `start_line` + `start_side` + `line` + `side` |
| Reply to line/thread comment | `glab mr note create --reply ...`               | `gh api .../comments/<id>/replies`            |
| Global comment               | `glab mr note create --resolvable=false`        | `gh pr comment`                               |

Never silently substitute one publication type for another.
