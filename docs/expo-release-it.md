# Expo Release It Setup

This project is set up to use `expo-release-it` for version bumps and local store release tasks.

Official docs:
- [Getting Started](https://expo-release-it.mjstudio.net/getting-started)
- [Configuration](https://expo-release-it.mjstudio.net/config)

## Current status

- `pnpm app-release patch|minor|major` uses [`scripts/release-bump.js`](../scripts/release-bump.js) to:
  - run `expo-release-it bump`
  - sync `package.json` version with `app.config.ts`
  - create a commit
  - create a `vX.Y.Z` git tag
  - push the branch and tag
- `pnpm release:init` runs the interactive `expo-release-it init` flow.
- Real credentials must stay out of git. Only examples are checked in.

## Before first release

1. Make sure Ruby and Bundler are available.

```bash
ruby -v
bundle -v
```

2. Native folders are generated, not committed.

`ios/` and `android/` are gitignored and generated from `app.config.ts` by `expo prebuild`. `expo-release-it build` runs prebuild itself, which also generates the iOS shared scheme (`refugeeliteracyprojectapp.xcscheme`) it builds with.

3. Put the real credentials into `expo-release-it/key/` with these exact filenames:

- `android_play_console_service_account.json`
- `android_release.keystore`
- `ios_app_store_connect_api_key.p8`

4. Run init once:

```bash
pnpm release:init
```

Recommended answers for this project:

- iOS Bundle Identifier: `com.refugee-literacy-project`
- iOS Developer Team Id: your Apple team id
- iOS Fastlane Match Github URL: your private signing repo
- iOS Fastlane Match Passphrase: your match passphrase
- iOS App Store Connect API Key ID: your key id
- iOS App Store Connect API Key Issuer ID: your issuer id
- iOS App Target Name: `refugeeliteracyprojectapp`
- Android Package Name: `com.refugee_literacy_project`
- Android Keystore Store Password: your keystore password
- Android Keystore Key Alias: your keystore alias
- Android Keystore Key Password: your key password

This creates `expo-release-it/keyholder.json`, which is gitignored.

5. If you want store metadata checked into the repo, pull it after init:

```bash
pnpm release:pull:android
pnpm release:pull:ios
```

## Push this branch

If you only want to push the setup branch without cutting a new release:

```bash
git checkout expo-release-it
git add .github/workflows/new-app-version.yml .gitignore app.config.ts package.json pnpm-lock.yaml expo-release-it.config.json expo-release-it scripts/release-bump.js docs/expo-release-it.md
git commit -m "chore: add expo-release-it release flow"
git push -u origin expo-release-it
```

Note:
- The worktree currently also contains a deleted iOS scheme file. Decide whether to restore it or include that deletion before committing.

## Cut a release

Only run this from a clean worktree.

Patch release:

```bash
pnpm app-release patch
```

Minor release:

```bash
pnpm app-release minor
```

Major release:

```bash
pnpm app-release major
```

What it does:

- bumps `VERSION_NAME` and `VERSION_CODE` in `app.config.ts`
- syncs `package.json`
- commits the change
- tags the release as `vX.Y.Z`
- pushes the branch and the tag

## Build and upload commands

Build locally:

```bash
pnpm release:build:android:aab
pnpm release:build:android:apk
pnpm release:build:ios
```

Upload to test tracks:

```bash
pnpm release:upload:android
pnpm release:upload:ios
```

Upload with metadata/screenshots:

```bash
pnpm release:upload:android:meta
pnpm release:upload:ios:meta
```

Submit to stores:

```bash
pnpm release:submit:android
pnpm release:submit:ios
```

## Important follow-up

Tag pushes still trigger the old GitHub release workflow in `.github/workflows/new-github-release.yml`, and that workflow dispatches `eas-build-preview.yml`.

If the goal is to stop using the old EAS release path, update or disable that workflow before relying on the new tag-based release flow.
