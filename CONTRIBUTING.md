# Contributing to TrainMate

## Branching and pull requests

1. Keep `main` stable and deployable.
2. Create a feature branch from `main` for every change:
   - `feature/<short-description>`
   - `fix/<short-description>`
   - `chore/<short-description>`
3. Open a Pull Request to `main`.
4. Wait for CI checks and at least one approval before merge.
5. Merge using squash merge unless there is a reason to preserve commit history.

## Local development checklist

Before opening a PR, run:

```powershell
npm run typecheck
npm run build
python -m compileall apps/ai/app
```

For infrastructure changes:

```powershell
cd infra\envs\dev
terraform fmt -recursive
terraform validate
```

## Pull request quality guidelines

- Keep PRs focused on a single scope.
- Include context, risk notes, and verification notes in the PR body.
- Update docs and environment examples when behavior/configuration changes.
