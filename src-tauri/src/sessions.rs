use crate::models::{LaunchSessionRequest, SessionRecord, ToolConfig};
use crate::tools::ToolRegistry;
use chrono::Utc;
use std::path::Path;
use uuid::Uuid;

pub fn create_session_record(
    registry: &ToolRegistry,
    request: LaunchSessionRequest,
    config: &ToolConfig,
) -> SessionRecord {
    let now = Utc::now().to_rfc3339();
    let title = session_title(&request.workspace_path, &request.tool_id);
    let runtime_profile = request.runtime_profile.unwrap_or_else(|| {
        registry
            .default_config_view(&request.tool_id)
            .ok()
            .and_then(|view| view.runtime_profile)
            .unwrap_or_else(default_profile)
    });
    let node_provider = request
        .node_provider
        .or_else(|| config.node_provider.clone())
        .unwrap_or_else(|| "managed".to_string());
    let model = request.model.or_else(|| config.model.clone());
    SessionRecord {
        session_id: Uuid::new_v4().to_string(),
        workspace_path: request.workspace_path,
        tool_id: request.tool_id,
        runtime_profile,
        node_provider,
        model,
        window_id: request.window_id,
        created_at: now.clone(),
        last_opened_at: now,
        last_exit_code: None,
        status: "running".to_string(),
        title,
        command_preview: String::new(),
    }
}

pub fn relaunch_session(existing: &SessionRecord, window_id: String) -> SessionRecord {
    let now = Utc::now().to_rfc3339();
    let mut session = existing.clone();
    session.window_id = window_id;
    session.status = "running".to_string();
    session.last_opened_at = now;
    session.last_exit_code = None;
    session
}

pub fn session_title(workspace_path: &str, tool_id: &str) -> String {
    let folder = Path::new(workspace_path)
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or(workspace_path);
    format!("{folder} · {}", tool_label(tool_id))
}

fn tool_label(tool_id: &str) -> &str {
    match tool_id {
        "codex" => "Codex",
        "claude" => "Claude Code",
        "gemini" => "Gemini CLI",
        "opencode" => "OpenCode",
        _ => tool_id,
    }
}

fn default_profile() -> String {
    if cfg!(target_os = "windows") {
        "powershell".to_string()
    } else {
        "zsh".to_string()
    }
}
