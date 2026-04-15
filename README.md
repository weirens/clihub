# CliHub

[English](./README.md) | [中文](./README.zh-CN.md)

CliHub is a Tauri 2 desktop workspace for launching, managing, and viewing multiple CLI coding agent sessions in one place.

## Core Features

- Multi-session management: manage multiple sessions in one window, grouped by workspace, with direct start and stop controls.
- Real terminal embedding: uses xterm.js with a real local PTY, so session output and input go to actual local processes.
- Multi-tool support: currently integrates `Codex`, `Claude Code`, `Gemini CLI`, and `OpenCode`.
- One-click install and repair: install, update, repair, or uninstall supported CLIs with live progress and log output.
- Tool configuration: configure `Provider URL`, `API Key`, `Model`, `Runtime Profile`, and `Node Provider` per CLI.
- System config inheritance: detects existing environment variables and official local config files, and shows where effective values come from.
- Isolated runtime directories: each session can use app-managed runtime config instead of overwriting your original CLI setup.
- Session persistence: session history is preserved across restarts; sessions that were running when the app closed are normalized back to `stopped`.
- Environment diagnostics: built-in checks for platform, system Node, managed Node, and Docker availability.
- Managed Node support: run tools with an app-managed Node runtime or switch to the system Node installation.
- Multiple runtime profiles: supports `PowerShell`, `Git Bash`, and `WSL` on Windows, and `zsh` on macOS.
- Multi-window workflow: open more than one workspace window.
- Appearance settings: supports Simplified Chinese, Traditional Chinese, and English, plus dark/light themes and separate UI/terminal font settings.

## Supported CLI Tools

| CLI | npm package | Notes |
| --- | --- | --- |
| Codex | `@openai/codex` | OpenAI CLI coding agent with custom Base URL support. |
| Claude Code | `@anthropic-ai/claude-code` | Anthropic terminal coding assistant with official login and custom Base URL support. |
| Gemini CLI | `@google/gemini-cli` | Google's terminal agent for Gemini workflows. |
| OpenCode | `opencode-ai` | Open-source coding agent with flexible provider routing. |

## Typical Workflow

1. Choose a workspace.
2. Pick the CLI you want to run.
3. If the CLI is missing, CliHub installs it first and shows live logs.
4. The session starts automatically and streams output into the embedded terminal.
5. You can stop or restart the session directly from the session list.

## Config and Persistence

- CliHub merges system-level config with app-saved config.
- Custom model, URL, or key settings do not directly overwrite your original official CLI config files.
- Session data is stored in the local app data directory with backup-based recovery logic.

## Local Development

```bash
npm ci
npm run tauri dev
```

## Production Build

```bash
npm run tauri build
```
