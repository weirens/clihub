mod models;
mod node_runtime;
mod process_utils;
mod sessions;
mod state;
mod tools;

use crate::models::{
    BootstrapSnapshot, DiagnosticsSnapshot, DockerStatus, InstallActionRequest, InstallActionResult,
    LaunchSessionRequest, ManagedNodeState, SaveToolConfigRequest, SessionExitEvent,
    SessionOutputEvent, SessionRecord, ToolConfig, ToolState, WindowSessionState,
};
use crate::node_runtime::NodeRuntimeManager;
use crate::process_utils::hide_background_window;
use crate::sessions::{create_session_record, relaunch_session};
use crate::state::{AppState, SessionRuntime};
use anyhow::{anyhow, Context};
use chrono::Utc;
use keyring::Entry;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::process::Command;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use tauri::{Emitter, Manager, RunEvent, State, WebviewUrl, WebviewWindowBuilder};

const SECRET_SERVICE: &str = "CliHub";

#[tauri::command]
async fn bootstrap_app(window_id: String, state: State<'_, AppState>) -> Result<BootstrapSnapshot, String> {
    state
        .ensure_window_state(&window_id)
        .map_err(|error| error.to_string())?;
    build_snapshot(&state, &window_id)
}

#[tauri::command]
async fn ensure_managed_node(state: State<'_, AppState>) -> Result<ManagedNodeState, String> {
    let managed = NodeRuntimeManager::ensure_managed_node(&state.paths)
        .await
        .map_err(|error| error.to_string())?;
    {
        let mut store = state
            .store
            .lock()
            .map_err(|_| "state store is poisoned".to_string())?;
        store.managed_node_version = managed.version.clone();
    }
    state.save_store().map_err(|error| error.to_string())?;
    Ok(managed)
}

#[tauri::command]
async fn save_tool_config(
    state: State<'_, AppState>,
    request: SaveToolConfigRequest,
) -> Result<ToolState, String> {
    let key_ref = format!("tool:{}", request.tool_id);
    if let Some(api_key) = request.api_key.clone() {
        let entry = Entry::new(SECRET_SERVICE, &key_ref).map_err(|error| error.to_string())?;
        if api_key.trim().is_empty() {
            let _ = entry.delete_credential();
        } else {
            entry.set_password(&api_key).map_err(|error| error.to_string())?;
        }
    }

    {
        let mut store = state
            .store
            .lock()
            .map_err(|_| "state store is poisoned".to_string())?;
        let mut config = store
            .tool_configs
            .get(&request.tool_id)
            .cloned()
            .unwrap_or(ToolConfig {
                tool_id: request.tool_id.clone(),
                provider_url: None,
                model: None,
                runtime_profile: None,
                node_provider: None,
                api_key_ref: None,
            });
        config.provider_url = sanitize_optional(request.provider_url);
        config.model = sanitize_optional(request.model);
        config.runtime_profile = sanitize_optional(request.runtime_profile);
        config.node_provider = sanitize_optional(request.node_provider);
        if let Some(api_key) = request.api_key {
            config.api_key_ref = if api_key.trim().is_empty() {
                None
            } else {
                Some(key_ref)
            };
        }
        store.tool_configs.insert(request.tool_id.clone(), config);
    }

    state.save_store().map_err(|error| error.to_string())?;
    let store = state
        .store
        .lock()
        .map_err(|_| "state store is poisoned".to_string())?;
    let managed_version = store.managed_node_version.clone();
    let config = store.tool_configs.get(&request.tool_id);
    let (descriptor, install_status, config_view) = state
        .registry
        .tool_state(&request.tool_id, config, &state.paths, managed_version)
        .map_err(|error| error.to_string())?;
    Ok(ToolState {
        descriptor,
        install_status,
        config: config_view,
    })
}

#[tauri::command]
async fn run_install_action(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    request: InstallActionRequest,
) -> Result<InstallActionResult, String> {
    let node_provider = {
        let store = state
            .store
            .lock()
            .map_err(|_| "state store is poisoned".to_string())?;
        store
            .tool_configs
            .get(&request.tool_id)
            .and_then(|config| config.node_provider.clone())
            .unwrap_or_else(|| "managed".to_string())
    };

    let result = state
        .registry
        .run_install_action(&app, &request.tool_id, &request.action, &node_provider, &state.paths)
        .await
        .map_err(|error| error.to_string())?;

    if node_provider == "managed" {
        let managed = NodeRuntimeManager::ensure_managed_node(&state.paths)
            .await
            .map_err(|error| error.to_string())?;
        let mut store = state
            .store
            .lock()
            .map_err(|_| "state store is poisoned".to_string())?;
        store.managed_node_version = managed.version;
        drop(store);
        state.save_store().map_err(|error| error.to_string())?;
    }

    Ok(result)
}

#[tauri::command]
async fn launch_session(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    request: LaunchSessionRequest,
) -> Result<SessionRecord, String> {
    if !std::path::Path::new(&request.workspace_path).exists() {
        return Err("Selected workspace does not exist.".to_string());
    }

    let config = {
        let store = state
            .store
            .lock()
            .map_err(|_| "state store is poisoned".to_string())?;
        store
            .tool_configs
            .get(&request.tool_id)
            .cloned()
            .unwrap_or(ToolConfig {
                tool_id: request.tool_id.clone(),
                provider_url: None,
                model: None,
                runtime_profile: None,
                node_provider: None,
                api_key_ref: None,
            })
    };

    let mut session = create_session_record(&state.registry, request, &config);
    spawn_session_process(&app, &state, &mut session, &config)
        .await
        .map_err(|error| error.to_string())?;

    {
        let mut store = state
            .store
            .lock()
            .map_err(|_| "state store is poisoned".to_string())?;
        store.sessions.push(session.clone());
    }
    state
        .set_active_session_for_window(&session.window_id, Some(session.session_id.clone()))
        .map_err(|error| error.to_string())?;
    state.save_store().map_err(|error| error.to_string())?;
    Ok(session)
}

#[tauri::command]
async fn relaunch_existing_session(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    session_id: String,
    window_id: String,
) -> Result<SessionRecord, String> {
    if state
        .runtimes
        .lock()
        .map_err(|_| "runtime store is poisoned".to_string())?
        .contains_key(&session_id)
    {
        state
            .set_active_session_for_window(&window_id, Some(session_id.clone()))
            .map_err(|error| error.to_string())?;
        let store = state
            .store
            .lock()
            .map_err(|_| "state store is poisoned".to_string())?;
        return store
            .sessions
            .iter()
            .find(|session| session.session_id == session_id)
            .cloned()
            .ok_or_else(|| "Session was not found.".to_string());
    }

    let (existing, config) = {
        let store = state
            .store
            .lock()
            .map_err(|_| "state store is poisoned".to_string())?;
        let session = store
            .sessions
            .iter()
            .find(|session| session.session_id == session_id)
            .cloned()
            .ok_or_else(|| "Session was not found.".to_string())?;
        let config = store
            .tool_configs
            .get(&session.tool_id)
            .cloned()
            .unwrap_or(ToolConfig {
                tool_id: session.tool_id.clone(),
                provider_url: None,
                model: None,
                runtime_profile: None,
                node_provider: None,
                api_key_ref: None,
            });
        (session, config)
    };

    let mut session = relaunch_session(&existing, window_id);
    spawn_session_process(&app, &state, &mut session, &config)
        .await
        .map_err(|error| error.to_string())?;

    {
        let mut store = state
            .store
            .lock()
            .map_err(|_| "state store is poisoned".to_string())?;
        if let Some(existing_session) = store
            .sessions
            .iter_mut()
            .find(|stored| stored.session_id == session.session_id)
        {
            *existing_session = session.clone();
        }
    }
    state
        .set_active_session_for_window(&session.window_id, Some(session.session_id.clone()))
        .map_err(|error| error.to_string())?;
    state.save_store().map_err(|error| error.to_string())?;
    Ok(session)
}

#[tauri::command]
async fn stop_session(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    if let Some(runtime) = state
        .runtimes
        .lock()
        .map_err(|_| "runtime store is poisoned".to_string())?
        .remove(&session_id)
    {
        runtime
            .child
            .lock()
            .map_err(|_| "child handle is poisoned".to_string())?
            .kill()
            .map_err(|error| error.to_string())?;
    }
    mark_session_ended(&state, &session_id, None).map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
async fn write_session_input(
    state: State<'_, AppState>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    let runtime = {
        let guard = state
            .runtimes
            .lock()
            .map_err(|_| "runtime store is poisoned".to_string())?;
        guard
            .get(&session_id)
            .cloned()
            .ok_or_else(|| "Session is not running.".to_string())?
    };
    let mut writer = runtime
        .writer
        .lock()
        .map_err(|_| "session writer is poisoned".to_string())?;
    writer
        .write_all(data.as_bytes())
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn resize_session(
    state: State<'_, AppState>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let runtime = {
        let guard = state
            .runtimes
            .lock()
            .map_err(|_| "runtime store is poisoned".to_string())?;
        guard
            .get(&session_id)
            .cloned()
            .ok_or_else(|| "Session is not running.".to_string())?
    };
    let result = runtime
        .master
        .lock()
        .map_err(|_| "pty master is poisoned".to_string())?
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|error| error.to_string());
    result
}

#[tauri::command]
async fn delete_session_history(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    {
        let mut store = state
            .store
            .lock()
            .map_err(|_| "state store is poisoned".to_string())?;
        store.sessions.retain(|session| session.session_id != session_id);
        for window in store.windows.values_mut() {
            if window.active_session_id.as_deref() == Some(&session_id) {
                window.active_session_id = None;
            }
        }
    }
    state.save_store().map_err(|error| error.to_string())
}

#[tauri::command]
async fn set_active_session(
    state: State<'_, AppState>,
    window_id: String,
    session_id: Option<String>,
) -> Result<WindowSessionState, String> {
    state
        .set_active_session_for_window(&window_id, session_id.clone())
        .map_err(|error| error.to_string())?;
    let store = state
        .store
        .lock()
        .map_err(|_| "state store is poisoned".to_string())?;
    store
        .windows
        .get(&window_id)
        .cloned()
        .ok_or_else(|| "Window state was not found.".to_string())
}

#[tauri::command]
async fn create_workspace_window(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<String, String> {
    let label = state.next_window_label();
    WebviewWindowBuilder::new(&app, &label, WebviewUrl::App("index.html".into()))
        .title("CliHub")
        .decorations(false)
        .inner_size(1570.0, 768.0)
        .build()
        .map_err(|error| error.to_string())?;
    state
        .ensure_window_state(&label)
        .map_err(|error| error.to_string())?;
    Ok(label)
}

fn build_snapshot(state: &AppState, window_id: &str) -> Result<BootstrapSnapshot, String> {
    let window_state = state
        .ensure_window_state(window_id)
        .map_err(|error| error.to_string())?;
    let (configs, sessions, managed_version) = {
        let store = state
            .store
            .lock()
            .map_err(|_| "state store is poisoned".to_string())?;
        (
            store.tool_configs.clone(),
            store.sessions.clone(),
            store.managed_node_version.clone(),
        )
    };
    let tools = state
        .registry
        .descriptors()
        .into_iter()
        .map(|descriptor| {
            let config = configs.get(&descriptor.id);
            let (descriptor, install_status, config) = state
                .registry
                .tool_state(&descriptor.id, config, &state.paths, managed_version.clone())
                .map_err(|error| error.to_string())?;
            Ok(ToolState {
                descriptor,
                install_status,
                config,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;
    let diagnostics = DiagnosticsSnapshot {
        platform: std::env::consts::OS.to_string(),
        windows_build_number: detect_windows_build_number(),
        system_node_version: NodeRuntimeManager::detect_system_node(),
        managed_node: NodeRuntimeManager::detect_managed_node(&state.paths, managed_version),
        docker: detect_docker_status(),
    };
    Ok(BootstrapSnapshot {
        tools,
        sessions,
        window_state,
        diagnostics,
    })
}

async fn spawn_session_process(
    app: &tauri::AppHandle,
    state: &AppState,
    session: &mut SessionRecord,
    config: &ToolConfig,
) -> anyhow::Result<()> {
    if session.runtime_profile == "wsl" && session.node_provider == "managed" {
        return Err(anyhow!(
            "WSL sessions currently require the CLI to be installed inside WSL. Switch this tool to System Node or choose PowerShell/Git Bash."
        ));
    }

    let api_key = config
        .api_key_ref
        .clone()
        .and_then(|reference| read_secret(&reference).ok());
    let (raw_command, tool_env) = state
        .registry
        .prepare_launch(session, config, api_key.as_deref(), &state.paths)?;

    let node_env = NodeRuntimeManager::resolve_node_env(&state.paths, &session.node_provider).await?;
    if session.node_provider == "managed" {
        let mut store = state
            .store
            .lock()
            .map_err(|_| anyhow!("state store is poisoned"))?;
        store.managed_node_version = Some(node_env.version.clone());
    }

    let (program, args, env_overrides, init_script) = build_shell_launch(
        &session.runtime_profile,
        &session.workspace_path,
        &raw_command.initial_command,
        &tool_env,
    )?;
    session.command_preview = raw_command.preview;

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: 30,
            cols: 120,
            pixel_width: 0,
            pixel_height: 0,
        })
        .context("failed to create PTY")?;

    let mut command = CommandBuilder::new(program);
    for arg in args {
        command.arg(arg);
    }
    command.cwd(&session.workspace_path);
    for (key, value) in node_env.env.iter() {
        command.env(key, value);
    }
    for (key, value) in env_overrides.iter() {
        command.env(key, value);
    }

    let child = pair
        .slave
        .spawn_command(command)
        .context("failed to start tool process")?;
    drop(pair.slave);

    let reader = pair
        .master
        .try_clone_reader()
        .context("failed to clone PTY reader")?;
    let writer = pair
        .master
        .take_writer()
        .context("failed to acquire PTY writer")?;

    let runtime = Arc::new(SessionRuntime {
        writer: std::sync::Mutex::new(writer),
        master: std::sync::Mutex::new(pair.master),
        child: std::sync::Mutex::new(child),
    });

    {
        let mut writer = runtime
            .writer
            .lock()
            .map_err(|_| anyhow!("session writer is poisoned"))?;
        if !init_script.is_empty() {
            writer
                .write_all(init_script.as_bytes())
                .context("failed to initialize shell session")?;
            writer.flush().ok();
        }
    }

    {
        let mut runtimes = state
            .runtimes
            .lock()
            .map_err(|_| anyhow!("runtime store is poisoned"))?;
        runtimes.insert(session.session_id.clone(), runtime.clone());
    }

    state.save_store()?;

    let session_id = session.session_id.clone();
    let app_handle = app.clone();
    std::thread::spawn(move || {
        let mut reader = reader;
        let mut buffer = [0_u8; 8192];
        let mut pending_utf8 = Vec::new();
        loop {
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(size) => {
                    let chunk = decode_utf8_stream_chunk(&mut pending_utf8, &buffer[..size]);
                    if !chunk.is_empty() {
                        let _ = app_handle.emit(
                            "session://output",
                            SessionOutputEvent {
                                session_id: session_id.clone(),
                                data: chunk,
                            },
                        );
                    }
                }
                Err(_) => break,
            }
        }
        if let Some(chunk) = flush_utf8_stream_chunk(&mut pending_utf8) {
            let _ = app_handle.emit(
                "session://output",
                SessionOutputEvent {
                    session_id: session_id.clone(),
                    data: chunk,
                },
            );
        }
        let exit_code = {
            let state = app_handle.state::<AppState>();
            let runtime = {
                let mut runtimes = state.runtimes.lock().ok();
                runtimes.as_mut().and_then(|map| map.remove(&session_id))
            };
            runtime
                .and_then(|handle| {
                    handle
                        .child
                        .lock()
                        .ok()
                        .and_then(|mut child| child.wait().ok())
                })
                .map(|status| status.exit_code() as i32)
        };
        let state = app_handle.state::<AppState>();
        let _ = mark_session_ended(&state, &session_id, exit_code);
        let _ = app_handle.emit(
            "session://exit",
            SessionExitEvent {
                session_id,
                exit_code,
            },
        );
    });

    Ok(())
}

fn build_shell_launch(
    profile: &str,
    workspace_path: &str,
    cli_command: &str,
    env: &HashMap<String, String>,
) -> anyhow::Result<(String, Vec<String>, HashMap<String, String>, String)> {
    let mut shell_env = env.clone();
    shell_env.insert("CLIHUB_SESSION".to_string(), "1".to_string());
    shell_env
        .entry("TERM".to_string())
        .or_insert_with(|| "xterm-256color".to_string());
    shell_env
        .entry("COLORTERM".to_string())
        .or_insert_with(|| "truecolor".to_string());
    shell_env
        .entry("TERM_PROGRAM".to_string())
        .or_insert_with(|| "CliHub".to_string());
    shell_env
        .entry("TERM_PROGRAM_VERSION".to_string())
        .or_insert_with(|| env!("CARGO_PKG_VERSION").to_string());

    match profile {
        "git-bash" => Ok((
            git_bash_program(),
            vec!["--login".to_string(), "-i".to_string()],
            shell_env.clone(),
            bash_init_script(&shell_env, cli_command),
        )),
        "wsl" => {
            let translated_workspace = translate_windows_path_to_wsl(workspace_path)
                .ok_or_else(|| anyhow!("The selected workspace could not be translated to a WSL path."))?;
            Ok((
                "wsl.exe".to_string(),
                vec![
                    "--cd".to_string(),
                    translated_workspace,
                    "bash".to_string(),
                    "-li".to_string(),
                ],
                HashMap::new(),
                wsl_init_script(&shell_env, cli_command),
            ))
        }
        "zsh" => Ok((
            "/bin/zsh".to_string(),
            vec!["-i".to_string()],
            shell_env.clone(),
            zsh_init_script(&shell_env, cli_command),
        )),
        _ => {
            #[cfg(windows)]
            {
                Ok((
                    "cmd.exe".to_string(),
                    vec!["/d".to_string(), "/c".to_string(), cli_command.to_string()],
                    shell_env,
                    String::new(),
                ))
            }
            #[cfg(not(windows))]
            {
                Ok(("/bin/sh".to_string(), vec!["-lc".to_string(), cli_command.to_string()], shell_env, String::new()))
            }
        }
    }
}

fn detect_docker_status() -> DockerStatus {
    let mut version_command = Command::new("docker");
    hide_background_window(&mut version_command);
    let version_output = version_command.arg("--version").output();
    let version_output = match version_output {
        Ok(output) if output.status.success() => output,
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            return DockerStatus {
                installed: false,
                running: false,
                version: None,
                detail: if stderr.is_empty() { None } else { Some(stderr) },
            };
        }
        Err(_) => {
            return DockerStatus {
                installed: false,
                running: false,
                version: None,
                detail: Some("Docker was not found.".to_string()),
            };
        }
    };

    let version = String::from_utf8_lossy(&version_output.stdout).trim().to_string();
    let mut info_command = Command::new("docker");
    hide_background_window(&mut info_command);
    let running = info_command
        .args(["info", "--format", "{{json .ServerVersion}}"])
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false);
    DockerStatus {
        installed: true,
        running,
        version: if version.is_empty() { None } else { Some(version) },
        detail: Some(if running {
            "Docker is installed and reachable.".to_string()
        } else {
            "Docker is installed but the daemon is not currently reachable.".to_string()
        }),
    }
}

fn detect_windows_build_number() -> Option<u32> {
    #[cfg(windows)]
    {
        let mut command = Command::new(powershell_program());
        hide_background_window(&mut command);
        let output = command
            .args([
                "-NoLogo",
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "[System.Environment]::OSVersion.Version.Build",
            ])
            .output()
            .ok()?;
        if !output.status.success() {
            return None;
        }
        String::from_utf8_lossy(&output.stdout).trim().parse().ok()
    }
    #[cfg(not(windows))]
    {
        None
    }
}

fn mark_session_ended(state: &AppState, session_id: &str, exit_code: Option<i32>) -> anyhow::Result<()> {
    {
        let mut store = state
            .store
            .lock()
            .map_err(|_| anyhow!("state store is poisoned"))?;
        if let Some(session) = store
            .sessions
            .iter_mut()
            .find(|session| session.session_id == session_id)
        {
            session.status = if state.shutting_down.load(Ordering::SeqCst) {
                "stopped".to_string()
            } else {
                "exited".to_string()
            };
            session.last_exit_code = exit_code;
            session.last_opened_at = Utc::now().to_rfc3339();
        }
    }
    state.save_store()?;
    Ok(())
}

fn cleanup_all_sessions(state: &AppState) -> anyhow::Result<()> {
    state.shutting_down.store(true, Ordering::SeqCst);

    {
        let mut runtimes = state
            .runtimes
            .lock()
            .map_err(|_| anyhow!("runtime store is poisoned"))?;
        for runtime in runtimes.drain().map(|(_, runtime)| runtime) {
            if let Ok(mut child) = runtime.child.lock() {
                let _ = child.kill();
            }
        }
    }

    {
        let mut store = state
            .store
            .lock()
            .map_err(|_| anyhow!("state store is poisoned"))?;
        for session in &mut store.sessions {
            if matches!(session.status.as_str(), "running" | "starting") {
                session.status = "stopped".to_string();
                session.last_exit_code = None;
                session.last_opened_at = Utc::now().to_rfc3339();
            }
        }
    }

    state.save_store()?;
    Ok(())
}

fn read_secret(reference: &str) -> anyhow::Result<String> {
    let entry = Entry::new(SECRET_SERVICE, reference)?;
    Ok(entry.get_password()?)
}

fn sanitize_optional(value: Option<String>) -> Option<String> {
    value.and_then(|candidate| {
        let trimmed = candidate.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

fn decode_utf8_stream_chunk(pending: &mut Vec<u8>, bytes: &[u8]) -> String {
    pending.extend_from_slice(bytes);
    let mut output = String::new();

    loop {
        match std::str::from_utf8(pending.as_slice()) {
            Ok(valid) => {
                output.push_str(valid);
                pending.clear();
                break;
            }
            Err(error) => {
                let valid_up_to = error.valid_up_to();
                if valid_up_to > 0 {
                    let valid = std::str::from_utf8(&pending[..valid_up_to]).unwrap_or_default();
                    output.push_str(valid);
                }

                match error.error_len() {
                    Some(invalid_len) => {
                        output.push('\u{FFFD}');
                        pending.drain(..valid_up_to + invalid_len);
                        if pending.is_empty() {
                            break;
                        }
                    }
                    None => {
                        pending.drain(..valid_up_to);
                        break;
                    }
                }
            }
        }
    }

    output
}

fn flush_utf8_stream_chunk(pending: &mut Vec<u8>) -> Option<String> {
    if pending.is_empty() {
        return None;
    }

    let chunk = String::from_utf8_lossy(pending).into_owned();
    pending.clear();
    Some(chunk)
}

fn quote_for_bash(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\"'\"'"))
}

fn bash_init_script(env: &HashMap<String, String>, cli_command: &str) -> String {
    let mut lines = Vec::new();
    for (key, value) in env {
        lines.push(format!("export {key}={}", quote_for_bash(value)));
    }
    lines.push(cli_command.to_string());
    lines.push("exit".to_string());
    lines.join("\n")
}

fn zsh_init_script(env: &HashMap<String, String>, cli_command: &str) -> String {
    bash_init_script(env, cli_command)
}

fn wsl_init_script(env: &HashMap<String, String>, cli_command: &str) -> String {
    let mut translated = HashMap::new();
    for (key, value) in env {
        let next_value = if looks_like_windows_path(value) {
            translate_windows_path_to_wsl(value).unwrap_or_else(|| value.to_string())
        } else {
            value.to_string()
        };
        translated.insert(key.clone(), next_value);
    }
    bash_init_script(&translated, cli_command)
}

fn looks_like_windows_path(value: &str) -> bool {
    value.len() > 2 && value.as_bytes()[1] == b':'
}

fn translate_windows_path_to_wsl(path: &str) -> Option<String> {
    let drive = path.chars().next()?.to_ascii_lowercase();
    let rest = path.get(2..)?.replace('\\', "/");
    Some(format!("/mnt/{drive}{rest}"))
}

fn git_bash_program() -> String {
    let candidates = [
        r"C:\Program Files\Git\bin\bash.exe",
        r"C:\Program Files\Git\usr\bin\bash.exe",
    ];
    for candidate in candidates {
        if std::path::Path::new(candidate).exists() {
            return candidate.to_string();
        }
    }
    "bash".to_string()
}

fn powershell_program() -> String {
    which::which("pwsh.exe")
        .or_else(|_| which::which("pwsh"))
        .map(|path| path.display().to_string())
        .unwrap_or_else(|_| "powershell.exe".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState::new().expect("failed to initialize CliHub state");
    tauri::Builder::default()
        .manage(app_state)
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            bootstrap_app,
            ensure_managed_node,
            save_tool_config,
            run_install_action,
            launch_session,
            relaunch_existing_session,
            stop_session,
            write_session_input,
            resize_session,
            delete_session_history,
            set_active_session,
            create_workspace_window
        ])
        .build(tauri::generate_context!())
        .expect("failed to build CliHub")
        .run(|app, event| {
            if matches!(event, RunEvent::ExitRequested { .. }) {
                let state = app.state::<AppState>();
                let _ = cleanup_all_sessions(&state);
            }
        });
}
