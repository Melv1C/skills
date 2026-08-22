# @melv1c/skills

CLI for [api.skills.melvyn.be](https://api.skills.melvyn.be): authenticate, upload
media assets, and publish hosted HTML documents. Replaces hand-rolled `curl`
multipart calls in agent skills.

## Install

```sh
npx @melv1c/skills --help        # one-off
bun add -g @melv1c/skills        # global; installs the `melv1c-skills` bin
```

The bin is `melv1c-skills`. It deliberately does **not** install a `skills`
command — that name belongs to another CLI.

## Auth

API keys are prefixed `av_` and created in the web UI (token creation requires an
authenticated browser session). The CLI resolves the key in this order:

1. `--token <key>` flag (warns: can land in shell history)
2. `SKILLS_API_TOKEN` env var
3. stored file `~/.config/melv1c-skills/token` (mode 0600), created by
   `melv1c-skills auth login`

```sh
melv1c-skills auth login            # paste or pipe the key; validated before storing
melv1c-skills auth login --rotate   # validate the new key before replacing the old
melv1c-skills whoami                # reports which source supplied the key
```

All output passes through a redaction layer: any `av_…` key is masked as
`av_***`, including error stacks.

## Commands

```sh
# assets (png, jpg, jpeg, gif, webp, webm, mp4, pdf; 50 MiB max)
melv1c-skills assets push ./shot.png [--public|--private] [--name shot.png]
melv1c-skills assets ls [--limit n] [--cursor id]
melv1c-skills assets rm <id...> [-f]

# hosted HTML documents (.html/.htm)
melv1c-skills docs publish plan.html [--description "..."] [--new-draft]
melv1c-skills docs ls
melv1c-skills docs rm <id>

# route by type: .html → docs, everything else → assets
melv1c-skills push ./*.png report.html
```

`docs publish` derives `clientKey` from the absolute file path by default:
re-publishing the same path updates the same URL. Pass `--new-draft` to force a
new document instead.

## Machine-readable output

`--json` emits stable JSON and suppresses human lines. The shape is semver'd;
breaking changes ship only under a major version bump.

## Exit codes

| Code | Meaning                  |
| ---- | ------------------------ |
| 0    | success                  |
| 1    | usage / validation error |
| 2    | authentication error     |
| 3    | API rejection (400, 413) |
| 4    | network failure or 5xx   |

On 5xx responses the server's `x-request-id` is echoed to help debugging.
Network errors are retried once at most; uploads are not retried blindly because
they are not idempotent server-side.

## Environment

- `SKILLS_API_TOKEN` — API key (CI-friendly, checked second after `--token`)
- `SKILLS_API_BASE` — override `https://api.skills.melvyn.be` (used by tests)

## Development

```sh
bun test src          # unit tests
tsc --noEmit          # typecheck (via bun run check-types)
bun run build         # bundle dist/index.js with a node shebang
```

Integration testing against the real backend: start docker-compose at the repo
root and point `SKILLS_API_BASE` at it.
