# Rentrix Git Tooling Policy

Use Git and GitHub tools carefully and efficiently.

## Before editing

1. Check the current branch and latest `main` SHA.
2. Check open pull requests related to the task.
3. Compare the task branch against `main`.
4. Read changed filenames and focused patches.
5. Read the latest CI status and failed-job logs when checks fail.

## During work

- Use one focused branch for one roadmap slice.
- Keep commits and diffs small.
- Preserve existing local work.
- Prefer updating an existing pull request when its scope is still correct.
- Create a replacement pull request only when a branch refresh closes the original automatically, and document the relationship.

## Before merge

1. Refresh pull-request metadata.
2. Confirm the expected head SHA.
3. Confirm the diff contains only intended files.
4. Confirm required checks passed on the latest head.
5. Record the merge SHA and the next roadmap item.

## Do not

- merge from stale CI evidence;
- mix unrelated work in one pull request;
- change shared branch history without a clear documented reason;
- retry connector operations through undocumented paths after an access boundary.
