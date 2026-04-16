<img width="1570" height="768" alt="71498102b936e57ea357555c32ec1da3" src="https://github.com/user-attachments/assets/0803af89-1f4e-457d-99a8-a991d42d1f55" /># CliHub

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

<img width="1570" height="768" alt="5c19e58dc0156933979f4dbb85e7fbf2" src="https://github.com/user-attachments/assets/a346b595-6633-439f-abb1-4a4f83d65849" />
<img width="1570" height="768" alt="05774004de6c7b9cfc00341d20ad4a01" src="https://github.com/user-attachments/assets/13ce1ea5-6b8f-42f1-8a80-708e2e66065b" />
<img width="1570" height="768" alt="71498102b936e57ea357555c32ec1da3" src="https://github.com/user-attachments/assets/b5a85704-9107-4d0c-b923-e22990862a8f" />
<img width="1570" height="768" alt="1153b6426516404b9d7ebf5fcbd543f5" src="https://github.com/user-attachments/assets/2146b9fc-6af3-4641-94a3-2f8131048dfc" />
<img width="1570" height="768" alt="5a45fcfdf51a612a1d637c288fe1a32d" src="https://github.com/user-attachments/assets/5988b51d-45d7-4893-8219-e487a1e9281d" />
<img width="1570" height="768" alt="944010f34558731b87e8baecfc6717b5" src="https://github.com/user-attachments/assets/ab44c49b-cf5d-438e-8de8-25a2b0553888" />
<img width="1394" height="849" alt="629ad1fa6d8c8f6ec3cd99d8f0d022e1" src="https://github.com/user-attachments/assets/5dce3a65-187c-4687-95aa-437af8c2092c" />


## Local Development

```bash
npm ci
npm run tauri dev
```

## Production Build

```bash
npm run tauri build
```
