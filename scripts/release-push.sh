#!/usr/bin/env sh

# Push the release commit without tags.
git push --no-follow-tags

# Push the tags for the release commit.
for tag in $(git tag --points-at HEAD); do
  git push --quiet --no-follow-tags origin "$tag"
  echo "Pushed tag $tag"
done
