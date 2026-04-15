# CliHub

CliHub is a Tauri 2 desktop workspace for running and managing multiple CLI coding agent sessions from one UI.

## Stack

- Tauri 2
- React 19
- TypeScript
- Rust
- xterm.js

## Local Development

```bash
npm ci
npm run tauri dev
```

## Production Build

```bash
npm run tauri build
```

## GitHub Release Builds

This repository includes a GitHub Actions workflow that builds release bundles for:

- Windows x64
- macOS Intel
- macOS Apple Silicon

The workflow runs when you push a tag like `v0.1.5`, or when you trigger it manually from the GitHub Actions page.

Generated installers and app bundles are uploaded to the GitHub Release for that version.
