use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolDescriptor {
    pub id: String,
    pub display_name: String,
    pub description: String,
    pub platform_support: Vec<String>,
    pub recommended_profiles: Vec<String>,
    pub requires_node: bool,
    pub supports_official_login: bool,
    pub supports_custom_base_url: bool,
    pub homepage: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallStatus {
    pub installed: bool,
    pub version: Option<String>,
    pub source: Option<String>,
    pub detail: Option<String>,
}

impl Default for InstallStatus {
    fn default() -> Self {
        Self {
            installed: false,
            version: None,
            source: None,
            detail: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolConfig {
    pub tool_id: String,
    pub provider_url: Option<String>,
    pub model: Option<String>,
    pub runtime_profile: Option<String>,
    pub node_provider: Option<String>,
    pub api_key_ref: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolConfigView {
    pub tool_id: String,
    pub provider_url: Option<String>,
    pub effective_provider_url: Option<String>,
    pub provider_url_source: String,
    pub model: Option<String>,
    pub runtime_profile: Option<String>,
    pub node_provider: Option<String>,
    pub has_api_key: bool,
    pub effective_has_api_key: bool,
    pub api_key_source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolState {
    pub descriptor: ToolDescriptor,
    pub install_status: InstallStatus,
    pub config: ToolConfigView,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionRecord {
    pub session_id: String,
    pub workspace_path: String,
    pub tool_id: String,
    pub runtime_profile: String,
    pub node_provider: String,
    pub model: Option<String>,
    pub window_id: String,
    pub created_at: String,
    pub last_opened_at: String,
    pub last_exit_code: Option<i32>,
    pub status: String,
    pub title: String,
    pub command_preview: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowSessionState {
    pub window_id: String,
    pub active_session_id: Option<String>,
    pub sidebar_selection: Option<String>,
    pub terminal_layout: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedNodeState {
    pub installed: bool,
    pub version: Option<String>,
    pub root_dir: String,
    pub npm_prefix: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerStatus {
    pub installed: bool,
    pub running: bool,
    pub version: Option<String>,
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticsSnapshot {
    pub platform: String,
    pub windows_build_number: Option<u32>,
    pub system_node_version: Option<String>,
    pub managed_node: ManagedNodeState,
    pub docker: DockerStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapSnapshot {
    pub tools: Vec<ToolState>,
    pub sessions: Vec<SessionRecord>,
    pub window_state: WindowSessionState,
    pub diagnostics: DiagnosticsSnapshot,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchSessionRequest {
    pub workspace_path: String,
    pub tool_id: String,
    pub window_id: String,
    pub model: Option<String>,
    pub runtime_profile: Option<String>,
    pub node_provider: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveToolConfigRequest {
    pub tool_id: String,
    pub provider_url: Option<String>,
    pub api_key: Option<String>,
    pub model: Option<String>,
    pub runtime_profile: Option<String>,
    pub node_provider: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallActionRequest {
    pub tool_id: String,
    pub action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallActionResult {
    pub tool_id: String,
    pub action: String,
    pub success: bool,
    pub log: String,
    pub install_status: InstallStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallProgressEvent {
    pub tool_id: String,
    pub action: String,
    pub stream: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionOutputEvent {
    pub session_id: String,
    pub data: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionExitEvent {
    pub session_id: String,
    pub exit_code: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistedState {
    pub tool_configs: BTreeMap<String, ToolConfig>,
    pub sessions: Vec<SessionRecord>,
    pub windows: BTreeMap<String, WindowSessionState>,
    pub managed_node_version: Option<String>,
}

impl Default for PersistedState {
    fn default() -> Self {
        Self {
            tool_configs: BTreeMap::new(),
            sessions: Vec::new(),
            windows: BTreeMap::new(),
            managed_node_version: None,
        }
    }
}
