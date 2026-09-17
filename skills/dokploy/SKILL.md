---
name: dokploy
description: Use when the user asks you to deploy an application to Dokploy. Or when you need to inspect the deployment history or logs.
---

# Dokploy

Use this skill to create, configure, deploy, inspect, start, stop or redeploy applications on a Dokploy instance.

## Configuration

Dokploy requires:

- `DOKPLOY_URL`
- `DOKPLOY_API_TOKEN`

Resolution order:

1. Environment variable.
2. Configurable file fallback.
3. Stop with a clear error.

Default fallback files:

```bash
~/.config/dokploy/url
~/.config/dokploy/token
```

Paths can be overridden with:

```bash
DOKPLOY_URL_FILE
DOKPLOY_TOKEN_FILE
```

Recommended setup:

```bash
mkdir -p ~/.config/dokploy
chmod 700 ~/.config/dokploy

printf '%s\n' 'https://dokploy.example.com' > ~/.config/dokploy/url
printf '%s\n' 'YOUR_API_TOKEN' > ~/.config/dokploy/token

chmod 600 ~/.config/dokploy/url ~/.config/dokploy/token
```

Never print, log, commit or return the API token.

## API helper

```bash
dokploy_read_config() {
  local env_name="$1"
  local file_name="$2"
  local default_file="$3"

  local value="${!env_name:-}"

  if [[ -n "$value" ]]; then
    printf '%s' "$value"
    return 0
  fi

  local file="${!file_name:-$default_file}"

  if [[ -f "$file" ]]; then
    value="$(tr -d '\r\n' < "$file")"

    if [[ -n "$value" ]]; then
      printf '%s' "$value"
      return 0
    fi
  fi

  echo "Dokploy configuration missing: define $env_name or provide $file." >&2
  return 1
}

dokploy_url() {
  local url

  url="$(dokploy_read_config \
    DOKPLOY_URL \
    DOKPLOY_URL_FILE \
    "$HOME/.config/dokploy/url"
  )" || return 1

  printf '%s' "${url%/}"
}

dokploy_token() {
  local file="${DOKPLOY_TOKEN_FILE:-$HOME/.config/dokploy/token}"

  if [[ -z "${DOKPLOY_API_TOKEN:-}" && -f "$file" ]]; then
    local mode
    mode="$(stat -c '%a' "$file" 2>/dev/null || true)"

    if [[ -n "$mode" ]] && (( (8#$mode & 077) != 0 )); then
      echo "Dokploy token file has unsafe permissions. Run: chmod 600 '$file'" >&2
      return 1
    fi
  fi

  dokploy_read_config \
    DOKPLOY_API_TOKEN \
    DOKPLOY_TOKEN_FILE \
    "$HOME/.config/dokploy/token"
}

dokploy_api() {
  local method="${1:?HTTP method required}"
  local endpoint="${2:?API endpoint required}"
  local body="${3-}"

  local url token
  url="$(dokploy_url)" || return 1
  token="$(dokploy_token)" || return 1

  local args=(
    --silent
    --show-error
    --fail-with-body
    -X "$method"
    "${url}/api/${endpoint#/}"
    -H "x-api-key: $token"
    -H "Content-Type: application/json"
  )

  [[ -n "$body" ]] && args+=(--data "$body")

  curl "${args[@]}"
}
```

Never enable shell tracing (`set -x`) while handling credentials.

## Core API

| Action                 | Endpoint                                                      |
| ---------------------- | ------------------------------------------------------------- |
| List projects          | `GET project.all`                                             |
| Get project            | `GET project.one?projectId=ID`                                |
| Create project         | `POST project.create`                                         |
| Update project         | `POST project.update`                                         |
| List environments      | `GET environment.byProjectId?projectId=ID`                    |
| Get environment        | `GET environment.one?environmentId=ID`                        |
| Create environment     | `POST environment.create`                                     |
| Update environment     | `POST environment.update`                                     |
| Get application        | `GET application.one?applicationId=ID`                        |
| Create application     | `POST application.create`                                     |
| Configure generic Git  | `POST application.saveGitProvider`                            |
| Configure GitHub       | `POST application.saveGithubProvider`                         |
| Configure Docker image | `POST application.saveDockerProvider`                         |
| Configure build        | `POST application.saveBuildType`                              |
| Save env vars          | `POST application.saveEnvironment`                            |
| Update application     | `POST application.update`                                     |
| Add domain             | `POST domain.create`                                          |
| List domains           | `GET domain.byApplicationId?applicationId=ID`                 |
| Deploy                 | `POST application.deploy`                                     |
| Redeploy               | `POST application.redeploy`                                   |
| Start                  | `POST application.start`                                      |
| Stop                   | `POST application.stop`                                       |
| Deployment history     | `GET deployment.all?applicationId=ID`                         |
| Deployment logs        | `GET deployment.readLogs?deploymentId=ID&tail=200`            |
| Runtime logs           | `GET application.readLogs?applicationId=ID&tail=200&since=1h` |

## Common payloads

Create project:

```json
{
  "name": "my-project",
  "description": "Optional description"
}
```

Create environment:

```json
{
  "name": "production",
  "projectId": "..."
}
```

Create application:

```json
{
  "name": "my-app",
  "environmentId": "...",
  "sourceType": "git"
}
```

Prefer generic Git unless a configured Git provider is explicitly required:

```json
{
  "applicationId": "...",
  "customGitUrl": "https://github.com/org/repo.git",
  "customGitBranch": "main",
  "customGitBuildPath": ".",
  "watchPaths": null
}
```

Configure Dockerfile build:

```json
{
  "applicationId": "...",
  "buildType": "dockerfile",
  "dockerfile": "Dockerfile",
  "dockerContextPath": "."
}
```

Environment variables:

```json
{
  "applicationId": "...",
  "env": "NODE_ENV=production\nPORT=3000",
  "buildArgs": null,
  "buildSecrets": null,
  "createEnvFile": true
}
```

Supported source types commonly include:

```text
git
github
gitlab
bitbucket
gitea
docker
drop
```

Supported build types commonly include:

```text
dockerfile
nixpacks
railpack
static
heroku_buildpacks
paketo_buildpacks
```

## Workflow

For a new deployment:

```text
project.all
→ reuse/create project
→ reuse/create environment
→ application.create
→ configure source
→ configure build
→ configure environment variables
→ configure domain if requested
→ application.deploy
→ inspect deployment history/logs
```

Always reuse existing resources when appropriate instead of creating duplicates.

After creating a resource, use the ID returned by Dokploy or re-read the parent resource. Never guess IDs.

Before changing environment variables, call `application.one` and preserve existing values unless the user explicitly requested full replacement.

Do not consider `application.deploy` alone proof of success. Inspect deployment status and logs when needed.

## Safety

Read operations may run freely.

Creating, updating, deploying, starting and stopping resources may run when clearly requested.

Treat deletions as destructive, including:

```text
project.remove
environment.remove
application.delete
domain.delete
database deletion
```

Only execute destructive operations when the user's request clearly authorizes deletion.

Never invent undocumented request fields. For uncommon Dokploy operations, inspect the current Dokploy API schema before making the request.

Error handling:

- `400`: return the Dokploy validation error.
- `401`: authentication is missing or invalid.
- `403`: insufficient permissions.
- `404`: requested resource was not found.
- `5xx`: report the Dokploy/server error and do not claim success.

Never expose credentials in error messages or logs.
