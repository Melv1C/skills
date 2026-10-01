---
name: mr-assets
description: Attach screenshots, images, and videos to GitLab merge requests or GitHub pull requests using native uploads. Use when adding media to descriptions or comments, or preparing attachment Markdown for an MR/PR.
---

# Attach media to a merge request or pull request

Use the destination platform's uploads through its CLI or token-authenticated HTTP requests, and keep the returned attachment URLs. Resolve the host, destination repository, and MR/PR from the current task before uploading. For a fork, the destination is the repository that owns the MR/PR, which can differ from the checkout's origin.

Default to uploading assets separately from publishing the description or comment on both platforms. Collect every requested attachment's URL or Markdown before composing the final body. If only attachment Markdown is requested, finish with those uploads. For comments or replies, use `mr-communication` to construct and publish the message.

## GitLab

Check `glab api --help` for `--form`. It sends multipart data; `--field` and `--raw-field` do not upload a binary attachment. Use a current `glab` or the documented multipart HTTP API if that flag is unavailable.

Upload to the destination project. Replace the example host and numeric project ID with the resolved values, and save each response separately:

```sh
glab api --hostname gitlab.example.com \
  --method POST "projects/1234/uploads" \
  --form "file=@/tmp/shot.png" \
  > /tmp/shot-upload.json
```

After a successful upload, extract the returned Markdown:

```sh
jq -er '.markdown | select(type == "string" and length > 0)' /tmp/shot-upload.json
```

Repeat for recordings with the same `file` field. Paste the returned `markdown` into the description or comment. GitLab renders supported video and audio files through image-style Markdown such as `![Demo](/uploads/secret/demo.mp4)`.

`projects/:id/uploads` also works when the current repository context is already pinned to the destination project. Prefer the explicit project ID when working across repositories or forks.

The returned `/uploads/...` links are relative to that project. When a fully qualified link is needed, combine the instance's web origin with the returned `full_path`. Preserve that path, whose format varies by GitLab version. Combining the host with `url` alone loses the project context.

To update an existing description, fetch and retain its current text, add the attachment Markdown, and write the complete body to a UTF-8 file. Use the resolved MR IID and repository URL:

```sh
glab mr update 42 \
  --repo "https://gitlab.example.com/group/project" \
  --description-file /tmp/mr-description.md
```

If that `glab` lacks `--description-file`, use the merge request update API with a JSON body containing `description` read from the file.

## GitHub

Use `gh api` by default. Upload each file, keep its returned URL, then publish one complete body. This works for descriptions, comments, and replies, and lets already-uploaded assets be reused without uploading them again.

The official CLI uploads to `POST https://uploads.github.com/user-attachments/assets`, with raw file bytes and query parameters `name`, `content_type`, and numeric `repository_id`. The JSON response contains `url`. This endpoint is verified from the CLI implementation rather than a standalone public REST reference. [GitHub CLI upload source](https://github.com/cli/cli/blob/v2.102.0/internal/attachments/client.go)

Resolve the destination repository's numeric ID and upload in the same shell invocation. Stop if the repository lookup fails:

```sh
github_repository_id=$(gh api --hostname github.com "repos/owner/repo" --jq .id) || exit 1
github_asset_path=/tmp/shot.png
gh api --hostname github.com --method POST \
  "https://uploads.github.com/user-attachments/assets" \
  --input "$github_asset_path" \
  --raw-field "name=${github_asset_path##*/}" \
  --raw-field "content_type=image/png" \
  --raw-field "repository_id=$github_repository_id" \
  --header "Content-Type: application/octet-stream" \
  --header "Accept: application/vnd.github+json" \
  > /tmp/shot-upload.json
```

With `--input`, `gh api` URL-encodes field parameters into the query and sends the named file as the body with its content length. It uses GitHub's saved token for the upload host. These operations work in `gh` versions predating `--attach`. [API command source](https://github.com/cli/cli/blob/v2.92.0/pkg/cmd/api/api.go), [Host normalization](https://github.com/cli/go-gh/blob/v2.13.0/pkg/auth/auth.go)

After a successful upload, extract the URL:

```sh
jq -er '.url | select(type == "string" and length > 0)' /tmp/shot-upload.json
```

For multiple files, resolve the repository ID once, then repeat the upload with each file's basename and MIME type. Save each response under a distinct name and keep a mapping from local file to returned URL. If an upload fails, retain successful results and retry only the missing files. Finish all required uploads before publishing the body.

Embed images as `![Description](returned-url)`. For videos, upload with the corresponding MIME type, such as `video/mp4`, and put the returned URL alone in its paragraph to render a player. Reuse the uploaded URL when publishing descriptions, comments, or replies.

For Enterprise Cloud tenants, use the resolved tenant host in both `--hostname` and `https://uploads.<tenant-host>/user-attachments/assets`. The upload endpoint does not support Enterprise Server. [Upload host construction](https://github.com/cli/cli/blob/v2.102.0/internal/ghinstance/host.go)

The direct endpoint has the same repository-write requirement as `--attach`. Use OAuth, a classic or fine-grained PAT, or a supported App user token. Installation tokens such as Actions' `GITHUB_TOKEN` cannot be used for this workflow. On a refusal, report the sanitized error and stop; changing the transport does not resolve missing permissions. Recheck the current CLI implementation if the endpoint's behavior changes.

### Publish the prepared body

For an existing PR, fetch its latest description after the uploads complete:

```sh
gh pr view 42 --repo owner/repo --json body --jq .body > /tmp/pr-body.md
```

Retain the existing text and insert the hosted attachment links with captions in the requested locations. Confirm every required file has a hosted URL, then publish once:

```sh
gh pr edit 42 --repo owner/repo --body-file /tmp/pr-body.md
```

For a requested new PR, pass the prepared file to `gh pr create --body-file`, with the repository, title, base, and head already resolved. Pass bodies for comments and replies to `mr-communication`.

### Optional combined upload and publication

`--attach` is an alternative when uploading and publishing in one command suits the task. It was added in `gh` 2.99.0; check the command's help for support. It accepts multiple files, so file count alone does not require the API workflow. [CLI attachment documentation](https://docs.github.com/en/github-cli/github-cli/attaching-files-with-github-cli)

```sh
gh pr edit 42 --repo owner/repo \
  --attach '/tmp/shot.png#Settings after saving' \
  --attach /tmp/demo.mp4
```

Without a body flag, this appends to the existing description. With `--body-file`, local references matching attached paths are rewritten to hosted URLs. Unreferenced attachments are appended in flag order. Repeat the flag for each file, up to 50 files per command. An image's optional alt text follows `#`; videos have no alt text. A standalone video reference becomes a player. [PR edit command](https://cli.github.com/manual/gh_pr_edit)

## Verify and recover

Read back the saved description or comment after publication. Confirm every requested attachment is present, existing text is retained, and local paths have been replaced by the platform's attachment links. Check that images use image Markdown and GitHub video URLs occupy their own paragraph. Report separately whether the assets were uploaded and whether the body was published.

GitHub's `--attach` can publish successful attachments even when others fail, then exit nonzero. Inspect the saved body and failure output before retrying, and retry only missing files. For direct uploads on either platform, reuse successful responses if a later upload or description update fails. Check the remote state after an ambiguous network failure before repeating a publication.

For authentication or permission failures, check the account on the resolved host. For rejected size or media type, use the platform's current limits and convert or compress the file before retrying.
