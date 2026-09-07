# Selecting the production release and rolling back

The new release is on **`release/safety-feedback-0.2.0`**. The existing **`master`** branch is unchanged. Pushing the new branch does not deploy it or change what your production server runs.

Run these commands in PowerShell (or a terminal) **inside the existing application checkout on the production server**. Do not paste GitHub tokens into commands or remote URLs; use Git's normal credential prompt or credential manager.

## Before changing production

Read [deployment changes](deployment-and-feedback.md) first. This release requires Node.js 22.12 or later, validated LDAPS, and changes document naming and retention. Real integration checks are still required.

Check the currently installed code:

```bash
git branch --show-current
git rev-parse --short HEAD
git status --short
```

If Git reports modified tracked files, do not discard them or use `reset --hard`. Preserve and review those changes before proceeding. In particular, the running application can modify the tracked form catalogue and tumour configuration files. A branch switch may otherwise be blocked or carry those edits into the new release.

Stop the application using your existing service/process manager. Make a secure backup outside the checkout of:

- `.env` and any separately managed service environment variables;
- all runtime configuration (normally `src/config`, or the directory in `CONFIG_DIR`);
- `public/consent-forms.json` if that is the active catalogue;
- generated documents that need to be retained, including clinician `TEMP` directories.

Record the existing start command/service configuration. Git does not back up ignored configuration, credentials, documents, or dependencies. Keep that backup on your own system; do not send it as feedback.

## First switch to the new release

Create a local branch pointing to the exact code currently installed, then fetch and select the new release:

```bash
git branch production-before-safety-20260907
git fetch origin
git switch --track origin/release/safety-feedback-0.2.0
```

The first command creates a rollback checkpoint; it does not switch branches. If that checkpoint name already exists, choose a different unused name instead of overwriting it.

If the new release branch already exists locally, use this instead of the last command:

```bash
git switch release/safety-feedback-0.2.0
git pull --ff-only origin release/safety-feedback-0.2.0
```

Verify the selected branch and Node version:

```bash
git branch --show-current
node --version
```

Apply the environment changes in the deployment guide, then install and build:

```bash
npm ci
npm run build
```

Restart using the same service/process manager. For an installation normally run directly in a terminal, the start command is `npm start`. Do not start a second process alongside an existing service.

Complete the synthetic-data deployment walkthrough in the guide before routine use. Enable the dedicated feedback log and bring back those files if anything fails.

## Pull later updates to this release

Check for local changes, stop the application, and back up runtime data before each update. Then:

```bash
git switch release/safety-feedback-0.2.0
git pull --ff-only origin release/safety-feedback-0.2.0
npm ci
npm run build
```

Restart the application. `--ff-only` stops rather than creating an unexpected merge if the local branch has diverged. If it fails, keep the error message and investigate; do not force the update.

## Roll back to the exact previously installed code

Stop the application. Preserve the current documents and configuration separately before restoring anything. Then:

```bash
git switch production-before-safety-20260907
npm ci
npm run build
```

Restore the earlier environment/configuration backup if necessary, then restart using the existing service/process manager. Do not pull into the rollback checkpoint: it should keep pointing to the exact original commit.

**Rolling back code does not roll back configuration or documents. The old code deletes the clinician's TEMP folder on each generation, so preserve any documents created by the new release before resuming the old workflow.**

You can select `master` with `git switch master`, but the local checkpoint is the more precise rollback target: `master` could receive unrelated changes in the future.

## List available branches

```bash
git fetch origin
git branch --all
```

The branch marked `*` is selected locally. Names beginning `remotes/origin/` are branches available on GitHub. Fetching or switching a branch does not install dependencies, rebuild, or restart the application; those steps remain necessary.
