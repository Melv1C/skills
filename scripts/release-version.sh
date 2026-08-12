#!/usr/bin/env sh

pending=$(
  find .changeset -maxdepth 1 -type f -name '*.md' ! -name 'README.md' 2>/dev/null |
    wc -l |
    awk '{ print $1 }'
)
pending=$((pending + 0))
if [ "$pending" -eq 0 ]; then
  echo "No pending changesets; skipping release:version."
  exit 0
fi

set -e

changeset version
sleep 1
changeset tag
