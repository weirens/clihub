import { invoke } from "@tauri-apps/api/core";
import type {
  BootstrapSnapshot,
  InstallActionRequest,
  InstallActionResult,
  LaunchSessionRequest,
  ManagedNodeState,
  SaveToolConfigRequest,
  SessionRecord,
  ToolState,
  WindowSessionState,
} from "../types";

export function bootstrapApp(windowId: string) {
  return invoke<BootstrapSnapshot>("bootstrap_app", { windowId });
}

export function ensureManagedNode() {
  return invoke<ManagedNodeState>("ensure_managed_node");
}

export function saveToolConfig(request: SaveToolConfigRequest) {
  return invoke<ToolState>("save_tool_config", { request });
}

export function runInstallAction(request: InstallActionRequest) {
  return invoke<InstallActionResult>("run_install_action", { request });
}

export function launchSession(request: LaunchSessionRequest) {
  return invoke<SessionRecord>("launch_session", { request });
}

export function relaunchExistingSession(sessionId: string, windowId: string) {
  return invoke<SessionRecord>("relaunch_existing_session", { sessionId, windowId });
}

export function stopSession(sessionId: string) {
  return invoke<void>("stop_session", { sessionId });
}

export function writeSessionInput(sessionId: string, data: string) {
  return invoke<void>("write_session_input", { sessionId, data });
}

export function resizeSession(sessionId: string, cols: number, rows: number) {
  return invoke<void>("resize_session", { sessionId, cols, rows });
}

export function deleteSessionHistory(sessionId: string) {
  return invoke<void>("delete_session_history", { sessionId });
}

export function setActiveSession(windowId: string, sessionId: string | null) {
  return invoke<WindowSessionState>("set_active_session", { windowId, sessionId });
}

export function createWorkspaceWindow() {
  return invoke<string>("create_workspace_window");
}
