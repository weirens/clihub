use crate::models::{
    InstallActionResult, InstallProgressEvent, InstallStatus, SessionRecord, ToolConfig, ToolConfigView,
    ToolDescriptor,
};
use crate::node_runtime::NodeRuntimeManager;
use crate::process_utils::hide_background_window;
use crate::state::AppPaths;
use anyhow::{anyhow, Context, Result};
use directories::BaseDirs;
use serde_json::{json, Value as JsonValue};
use std::collections::HashMap;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use toml::Value as TomlValue;

pub struct ToolRegistry {
    specs: Vec<ToolSpec>,
}

struct ToolSpec {
    descriptor: ToolDescriptor,
    binary_name: &'static str,
    npm_package: &'static str,
    default_model: &'static str,
}

pub struct RawLaunchCommand {
    pub initial_command: String,
    pub preview: String,
}

#[derive(Default)]
struct InheritedToolConfig {
    provider_url: Option<String>,
    has_api_key: bool,
}

impl ToolRegistry {
    pub fn new() -> Self {
        Self {
            specs: vec![
                ToolSpec {
                    descriptor: ToolDescriptor {
                        id: "codex".to_string(),
                        display_name: "Codex".to_string(),
                        description: "OpenAI coding agent with CLI-native workflows.".to_string(),
                        platform_support: vec!["windows".to_string(), "macos".to_string()],
                        recommended_profiles: if cfg!(target_os = "windows") {
                            vec![
                                "powershell".to_string(),
                                "git-bash".to_string(),
                                "wsl".to_string(),
                            ]
                        } else {
                            vec!["zsh".to_string()]
                        },
                        requires_node: true,
                        supports_official_login: false,
                        supports_custom_base_url: true,
                        homepage: "https://developers.openai.com/codex/cli".to_string(),
                    },
                    binary_name: "codex",
                    npm_package: "@openai/codex",
                    default_model: "gpt-5-codex",
                },
                ToolSpec {
                    descriptor: ToolDescriptor {
                        id: "claude".to_string(),
                        display_name: "Claude Code".to_string(),
                        description: "Anthropic's coding assistant optimized for terminal workflows."
                            .to_string(),
                        platform_support: vec!["windows".to_string(), "macos".to_string()],
                        recommended_profiles: if cfg!(target_os = "windows") {
                            vec![
                                "powershell".to_string(),
                                "git-bash".to_string(),
                                "wsl".to_string(),
                            ]
                        } else {
                            vec!["zsh".to_string()]
                        },
                        requires_node: true,
                        supports_official_login: true,
                        supports_custom_base_url: true,
                        homepage: "https://code.claude.com/docs".to_string(),
                    },
                    binary_name: "claude",
                    npm_package: "@anthropic-ai/claude-code",
                    default_model: "claude-sonnet-4-5",
                },
                ToolSpec {
                    descriptor: ToolDescriptor {
                        id: "gemini".to_string(),
                        display_name: "Gemini CLI".to_string(),
                        description: "Google's CLI agent with Gemini and Vertex AI workflows."
                            .to_string(),
                        platform_support: vec!["windows".to_string(), "macos".to_string()],
                        recommended_profiles: if cfg!(target_os = "windows") {
                            vec!["powershell".to_string(), "git-bash".to_string()]
                        } else {
                            vec!["zsh".to_string()]
                        },
                        requires_node: true,
                        supports_official_login: true,
                        supports_custom_base_url: false,
                        homepage: "https://geminicli.com/docs".to_string(),
                    },
                    binary_name: "gemini",
                    npm_package: "@google/gemini-cli",
                    default_model: "gemini-2.5-pro",
                },
                ToolSpec {
                    descriptor: ToolDescriptor {
                        id: "opencode".to_string(),
                        display_name: "OpenCode".to_string(),
                        description: "Open-source coding agent with flexible provider routing."
                            .to_string(),
                        platform_support: vec!["windows".to_string(), "macos".to_string()],
                        recommended_profiles: if cfg!(target_os = "windows") {
                            vec!["powershell".to_string(), "git-bash".to_string(), "wsl".to_string()]
                        } else {
                            vec!["zsh".to_string()]
                        },
                        requires_node: true,
                        supports_official_login: false,
                        supports_custom_base_url: true,
                        homepage: "https://opencode.ai/docs".to_string(),
                    },
                    binary_name: "opencode",
                    npm_package: "opencode-ai",
                    default_model: "gpt-4.1",
                },
            ],
        }
    }

    pub fn descriptors(&self) -> Vec<ToolDescriptor> {
        self.specs.iter().map(|spec| spec.descriptor.clone()).collect()
    }

    pub fn default_config_view(&self, tool_id: &str) -> Result<ToolConfigView> {
        let spec = self.spec(tool_id)?;
        Ok(ToolConfigView {
            tool_id: tool_id.to_string(),
            provider_url: None,
            effective_provider_url: None,
            provider_url_source: "default".to_string(),
            model: Some(spec.default_model.to_string()),
            runtime_profile: spec.descriptor.recommended_profiles.first().cloned(),
            node_provider: Some("managed".to_string()),
            has_api_key: false,
            effective_has_api_key: false,
            api_key_source: "none".to_string(),
        })
    }

    pub fn tool_state(
        &self,
        tool_id: &str,
        config: Option<&ToolConfig>,
        paths: &AppPaths,
        managed_version: Option<String>,
    ) -> Result<(ToolDescriptor, InstallStatus, ToolConfigView)> {
        let descriptor = self.spec(tool_id)?.descriptor.clone();
        let install_status = self.detect_install_status(tool_id, paths)?;
        let inherited = self.detect_inherited_config(tool_id);
        let mut view = self.default_config_view(tool_id)?;
        if let Some(existing) = config {
            view.provider_url = existing.provider_url.clone();
            view.model = existing.model.clone().or(view.model);
            view.runtime_profile = existing.runtime_profile.clone().or(view.runtime_profile);
            view.node_provider = existing.node_provider.clone().or(view.node_provider);
            view.has_api_key = existing.api_key_ref.is_some();
        }
        view.effective_provider_url = view.provider_url.clone().or(inherited.provider_url.clone());
        view.provider_url_source = if view.provider_url.is_some() {
            "saved".to_string()
        } else if inherited.provider_url.is_some() {
            "system".to_string()
        } else if descriptor.supports_custom_base_url {
            "default".to_string()
        } else {
            "none".to_string()
        };
        view.effective_has_api_key = view.has_api_key || inherited.has_api_key;
        view.api_key_source = if view.has_api_key {
            "saved".to_string()
        } else if inherited.has_api_key {
            "system".to_string()
        } else {
            "none".to_string()
        };
        if view.node_provider.as_deref() == Some("managed") && managed_version.is_none() {
            view.node_provider = Some("managed".to_string());
        }
        Ok((descriptor, install_status, view))
    }

    fn detect_inherited_config(&self, tool_id: &str) -> InheritedToolConfig {
        match tool_id {
            "codex" => InheritedToolConfig {
                provider_url: read_codex_system_provider_url(),
                has_api_key: env_has_any(&["OPENAI_API_KEY"])
                    || default_codex_auth_path()
                        .as_deref()
                        .and_then(read_json)
                        .and_then(|root| {
                            root.get("OPENAI_API_KEY")
                                .and_then(JsonValue::as_str)
                                .map(|value| !value.trim().is_empty())
                        })
                        .unwrap_or(false),
            },
            "claude" => {
                let settings = default_claude_settings_path().as_deref().and_then(read_json);
                let settings_env = settings
                    .as_ref()
                    .and_then(|root| root.get("env"))
                    .and_then(JsonValue::as_object);
                InheritedToolConfig {
                    provider_url: settings_env
                        .and_then(|env| env.get("ANTHROPIC_BASE_URL"))
                        .and_then(JsonValue::as_str)
                        .and_then(|value| normalized_config_value(Some(value)))
                        .or_else(|| first_present_env(&["ANTHROPIC_BASE_URL"])),
                    has_api_key: settings_env
                        .and_then(|env| env.get("ANTHROPIC_API_KEY").or_else(|| env.get("ANTHROPIC_AUTH_TOKEN")))
                        .and_then(JsonValue::as_str)
                        .map(|value| !value.trim().is_empty())
                        .unwrap_or(false)
                        || env_has_any(&["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"]),
                }
            }
            "gemini" => InheritedToolConfig {
                provider_url: first_present_env(&["GOOGLE_API_BASE_URL", "GEMINI_BASE_URL"]),
                has_api_key: env_has_any(&["GEMINI_API_KEY", "GOOGLE_API_KEY"]),
            },
            "opencode" => InheritedToolConfig {
                provider_url: read_opencode_system_provider_url()
                    .or_else(|| first_present_env(&["OPENCODE_BASE_URL", "OPENAI_BASE_URL"])),
                has_api_key: env_has_any(&["OPENCODE_API_KEY", "OPENAI_API_KEY"]),
            },
            _ => InheritedToolConfig::default(),
        }
    }

    pub fn detect_install_status(&self, tool_id: &str, paths: &AppPaths) -> Result<InstallStatus> {
        let spec = self.spec(tool_id)?;
        let managed = NodeRuntimeManager::install_bin_path(paths, spec.binary_name);
        if managed.exists() {
            let version = Self::detect_binary_version(&managed);
            return Ok(InstallStatus {
                installed: true,
                version,
                source: Some("managed".to_string()),
                detail: Some(format!("Installed in {}", managed.display())),
            });
        }
        if let Ok(system_binary) = which::which(spec.binary_name) {
            let version = Self::detect_binary_version(&system_binary);
            return Ok(InstallStatus {
                installed: true,
                version,
                source: Some("system".to_string()),
                detail: Some(format!("Discovered in PATH at {}", system_binary.display())),
            });
        }
        Ok(InstallStatus {
            installed: false,
            version: None,
            source: None,
            detail: Some("Not installed yet".to_string()),
        })
    }

    pub async fn run_install_action(
        &self,
        app: &AppHandle,
        tool_id: &str,
        action: &str,
        node_provider: &str,
        paths: &AppPaths,
    ) -> Result<InstallActionResult> {
        let spec = self.spec(tool_id)?;
        emit_install_progress(
            app,
            tool_id,
            action,
            "system",
            format!("准备 {} 的运行环境...", spec.descriptor.display_name),
        );
        let node_env = NodeRuntimeManager::resolve_node_env(paths, node_provider).await?;
        let npm_program = node_env.npm_path.clone();
        let mut command = Command::new(&npm_program);
        hide_background_window(&mut command);
        command.envs(node_env.env.clone());
        command.stdout(Stdio::piped());
        command.stderr(Stdio::piped());
        command.arg(match action {
            "uninstall" => "uninstall",
            _ => "install",
        });
        command.arg("-g");
        if action == "repair" {
            command.arg("--force");
        }
        command.arg(spec.npm_package);
        emit_install_progress(
            app,
            tool_id,
            action,
            "system",
            format!("开始执行: {} {} -g {}", npm_program.display(), action, spec.npm_package),
        );

        let mut child = command
            .spawn()
            .with_context(|| format!("failed to run {}", npm_program.display()))?;
        let stdout_log = Arc::new(Mutex::new(String::new()));
        let stderr_log = Arc::new(Mutex::new(String::new()));

        let stdout_handle = child.stdout.take().map(|stdout| {
            spawn_stream_pump(
                stdout,
                stdout_log.clone(),
                app.clone(),
                tool_id.to_string(),
                action.to_string(),
                "stdout",
            )
        });
        let stderr_handle = child.stderr.take().map(|stderr| {
            spawn_stream_pump(
                stderr,
                stderr_log.clone(),
                app.clone(),
                tool_id.to_string(),
                action.to_string(),
                "stderr",
            )
        });

        let output = child.wait()?;
        if let Some(handle) = stdout_handle {
            let _ = handle.join();
        }
        if let Some(handle) = stderr_handle {
            let _ = handle.join();
        }

        let stdout = stdout_log
            .lock()
            .map_err(|_| anyhow!("stdout log is poisoned"))?
            .clone();
        let stderr = stderr_log
            .lock()
            .map_err(|_| anyhow!("stderr log is poisoned"))?
            .clone();
        let log = [stdout.trim(), stderr.trim()]
            .iter()
            .filter(|value| !value.is_empty())
            .cloned()
            .collect::<Vec<_>>()
            .join("\n");
        let install_status = self.detect_install_status(tool_id, paths)?;
        Ok(InstallActionResult {
            tool_id: tool_id.to_string(),
            action: action.to_string(),
            success: output.success(),
            log,
            install_status,
        })
    }

    pub fn prepare_launch(
        &self,
        session: &SessionRecord,
        config: &ToolConfig,
        api_key: Option<&str>,
        paths: &AppPaths,
    ) -> Result<(RawLaunchCommand, HashMap<String, String>)> {
        let spec = self.spec(&session.tool_id)?;
        self.resolve_executable(&session.tool_id, paths)
            .ok_or_else(|| anyhow!("{} is not installed", spec.descriptor.display_name))?;
        let env = self.materialize_runtime_env(spec, session, config, api_key, paths)?;
        Ok((
            RawLaunchCommand {
                initial_command: spec.binary_name.to_string(),
                preview: spec.binary_name.to_string(),
            },
            env,
        ))
    }

    fn materialize_runtime_env(
        &self,
        spec: &ToolSpec,
        session: &SessionRecord,
        config: &ToolConfig,
        api_key: Option<&str>,
        paths: &AppPaths,
    ) -> Result<HashMap<String, String>> {
        let home_dir = paths.runtime_home(&spec.descriptor.id).join(&session.session_id);
        fs::create_dir_all(&home_dir)?;
        let mut env = HashMap::new();
        let provider_url = normalized_config_value(config.provider_url.as_deref());
        let configured_model =
            normalized_config_value(config.model.as_deref()).unwrap_or_else(|| spec.default_model.to_string());
        let has_custom_model = configured_model != spec.default_model;

        match spec.descriptor.id.as_str() {
            "codex" => {
                if let Some(key) = api_key {
                    env.insert("OPENAI_API_KEY".to_string(), key.to_string());
                }
                if has_custom_model || provider_url.is_some() {
                    env.insert("CODEX_HOME".to_string(), home_dir.display().to_string());
                    write_codex_config(
                        &home_dir.join("config.toml"),
                        default_codex_config_path().as_deref(),
                        &configured_model,
                        provider_url.as_deref(),
                    )?;
                }
            }
            "claude" => {
                if let Some(key) = api_key {
                    env.insert("ANTHROPIC_API_KEY".to_string(), key.to_string());
                }
                if let Some(url) = provider_url.as_deref() {
                    env.insert("ANTHROPIC_BASE_URL".to_string(), url.to_string());
                }
                if has_custom_model {
                    env.insert("ANTHROPIC_MODEL".to_string(), configured_model.clone());
                }
            }
            "gemini" => {
                if let Some(key) = api_key {
                    env.insert("GEMINI_API_KEY".to_string(), key.to_string());
                }
                if has_custom_model {
                    env.insert("GEMINI_MODEL".to_string(), configured_model.clone());
                }
                if let Some(url) = provider_url.as_deref() {
                    env.insert("CLIHUB_GEMINI_PROVIDER_URL".to_string(), url.to_string());
                }
            }
            "opencode" => {
                if let Some(key) = api_key {
                    env.insert("OPENCODE_API_KEY".to_string(), key.to_string());
                }
                if has_custom_model || provider_url.is_some() {
                    let config_path = home_dir.join("opencode.json");
                    let config_json = json!({
                        "$schema": "https://opencode.ai/config.json",
                        "provider": {
                            "clihub": {
                                "name": "CliHub",
                                "npm": "@ai-sdk/openai-compatible",
                                "options": {
                                    "baseURL": provider_url
                                        .clone()
                                        .unwrap_or_else(|| "https://api.openai.com/v1".to_string()),
                                    "apiKey": "{env:OPENCODE_API_KEY}"
                                },
                                "models": {
                                    configured_model.clone(): {
                                        "name": configured_model.clone()
                                    }
                                }
                            }
                        },
                        "model": format!("clihub/{configured_model}")
                    });
                    fs::write(&config_path, serde_json::to_string_pretty(&config_json)?)?;
                    env.insert("OPENCODE_CONFIG".to_string(), config_path.display().to_string());
                }
            }
            _ => {}
        }

        Ok(env)
    }

    fn resolve_executable(&self, tool_id: &str, paths: &AppPaths) -> Option<PathBuf> {
        let spec = self.spec(tool_id).ok()?;
        let managed_binary = NodeRuntimeManager::install_bin_path(paths, spec.binary_name);
        if managed_binary.exists() {
            return Some(managed_binary);
        }
        which::which(spec.binary_name).ok()
    }

    fn detect_binary_version(binary: &Path) -> Option<String> {
        let mut command = Command::new(binary);
        hide_background_window(&mut command);
        let output = command.arg("--version").output().ok()?;
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !stdout.is_empty() {
                return Some(stdout);
            }
        }
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if stderr.is_empty() {
            None
        } else {
            Some(stderr)
        }
    }

    fn spec(&self, tool_id: &str) -> Result<&ToolSpec> {
        self.specs
            .iter()
            .find(|spec| spec.descriptor.id == tool_id)
            .ok_or_else(|| anyhow!("unknown tool: {tool_id}"))
    }
}

fn emit_install_progress(app: &AppHandle, tool_id: &str, action: &str, stream: &str, message: String) {
    let _ = app.emit(
        "install://progress",
        InstallProgressEvent {
            tool_id: tool_id.to_string(),
            action: action.to_string(),
            stream: stream.to_string(),
            message,
        },
    );
}

fn spawn_stream_pump<R: Read + Send + 'static>(
    mut reader: R,
    log: Arc<Mutex<String>>,
    app: AppHandle,
    tool_id: String,
    action: String,
    stream: &'static str,
) -> std::thread::JoinHandle<()> {
    std::thread::spawn(move || {
        let mut buffer = [0_u8; 4096];
        loop {
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(size) => {
                    let chunk = String::from_utf8_lossy(&buffer[..size]).to_string();
                    if let Ok(mut guard) = log.lock() {
                        guard.push_str(&chunk);
                    }
                    emit_install_progress(&app, &tool_id, &action, stream, chunk);
                }
                Err(error) => {
                    emit_install_progress(
                        &app,
                        &tool_id,
                        &action,
                        "system",
                        format!("读取安装输出失败: {error}"),
                    );
                    break;
                }
            }
        }
    })
}

fn normalized_config_value(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn default_codex_config_path() -> Option<PathBuf> {
    BaseDirs::new().map(|dirs| dirs.home_dir().join(".codex").join("config.toml"))
}

fn default_codex_auth_path() -> Option<PathBuf> {
    BaseDirs::new().map(|dirs| dirs.home_dir().join(".codex").join("auth.json"))
}

fn default_claude_settings_path() -> Option<PathBuf> {
    BaseDirs::new().map(|dirs| dirs.home_dir().join(".claude").join("settings.json"))
}

fn default_opencode_config_path() -> Option<PathBuf> {
    BaseDirs::new().map(|dirs| dirs.home_dir().join(".config").join("opencode").join("opencode.json"))
}

fn read_codex_system_provider_url() -> Option<String> {
    let root = default_codex_config_path().as_deref().and_then(read_toml)?;
    let table = root.as_table()?;
    let providers = table.get("model_providers").and_then(TomlValue::as_table)?;

    if let Some(provider_key) = table.get("model_provider").and_then(TomlValue::as_str) {
        if let Some(provider_url) = providers
            .get(provider_key)
            .and_then(TomlValue::as_table)
            .and_then(|provider| provider.get("base_url"))
            .and_then(TomlValue::as_str)
            .and_then(|value| normalized_config_value(Some(value)))
        {
            return Some(provider_url);
        }
    }

    providers.values().find_map(|provider| {
        provider
            .as_table()
            .and_then(|provider| provider.get("base_url"))
            .and_then(TomlValue::as_str)
            .and_then(|value| normalized_config_value(Some(value)))
    })
}

fn read_opencode_system_provider_url() -> Option<String> {
    let root = default_opencode_config_path().as_deref().and_then(read_json)?;
    root.get("provider")
        .and_then(JsonValue::as_object)
        .and_then(|providers| {
            providers.values().find_map(|provider| {
                provider
                    .get("options")
                    .and_then(JsonValue::as_object)
                    .and_then(|options| options.get("baseURL"))
                    .and_then(JsonValue::as_str)
            })
        })
        .and_then(|value| normalized_config_value(Some(value)))
}

fn write_codex_config(
    path: &Path,
    source_path: Option<&Path>,
    configured_model: &str,
    provider_url: Option<&str>,
) -> Result<()> {
    let mut root = source_path
        .and_then(read_toml)
        .or_else(|| read_toml(path))
        .unwrap_or_else(|| TomlValue::Table(Default::default()));
    let table = ensure_toml_table(&mut root);
    table.insert("model".to_string(), TomlValue::String(configured_model.to_string()));

    if let Some(url) = provider_url {
        table.insert(
            "model_provider".to_string(),
            TomlValue::String("clihub".to_string()),
        );
        let providers = ensure_nested_table(table, "model_providers");
        let clihub = ensure_nested_table(providers, "clihub");
        clihub.insert("name".to_string(), TomlValue::String("CliHub".to_string()));
        clihub.insert("base_url".to_string(), TomlValue::String(url.to_string()));
        clihub.insert(
            "env_key".to_string(),
            TomlValue::String("OPENAI_API_KEY".to_string()),
        );
        clihub.insert(
            "wire_api".to_string(),
            TomlValue::String("responses".to_string()),
        );
    }

    fs::write(path, toml::to_string_pretty(&root)?)?;
    Ok(())
}

fn read_toml(path: &Path) -> Option<TomlValue> {
    fs::read_to_string(path)
        .ok()
        .and_then(|raw| toml::from_str::<TomlValue>(&raw).ok())
}

fn read_json(path: &Path) -> Option<JsonValue> {
    fs::read_to_string(path)
        .ok()
        .and_then(|raw| serde_json::from_str::<JsonValue>(&raw).ok())
}

fn env_has_any(keys: &[&str]) -> bool {
    keys.iter().any(|key| {
        std::env::var(key)
            .ok()
            .map(|value| !value.trim().is_empty())
            .unwrap_or(false)
    })
}

fn first_present_env(keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| std::env::var(key).ok().and_then(|value| normalized_config_value(Some(&value))))
}

fn ensure_toml_table(value: &mut TomlValue) -> &mut toml::map::Map<String, TomlValue> {
    if !matches!(value, TomlValue::Table(_)) {
        *value = TomlValue::Table(Default::default());
    }
    match value {
        TomlValue::Table(table) => table,
        _ => unreachable!(),
    }
}

fn ensure_nested_table<'a>(
    table: &'a mut toml::map::Map<String, TomlValue>,
    key: &str,
) -> &'a mut toml::map::Map<String, TomlValue> {
    let entry = table
        .entry(key.to_string())
        .or_insert_with(|| TomlValue::Table(Default::default()));
    ensure_toml_table(entry)
}
