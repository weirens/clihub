export type RuntimeProfile = "powershell" | "git-bash" | "wsl" | "zsh";
export type NodeProvider = "managed" | "system";
export type SessionStatus = "starting" | "running" | "stopped" | "exited" | "error";

export interface ToolDescriptor {
  id: string;
  displayName: string;
  description: string;
  platformSupport: string[];
  recommendedProfiles: RuntimeProfile[];
  requiresNode: boolean;
  supportsOfficialLogin: boolean;
  supportsCustomBaseUrl: boolean;
  homepage: string;
}

export interface InstallStatus {
  installed: boolean;
  version: string | null;
  source: string | null;
  detail: string | null;
}

export interface ToolConfigView {
  toolId: string;
  providerUrl: string | null;
  effectiveProviderUrl: string | null;
  providerUrlSource: "saved" | "system" | "default" | "none";
  model: string | null;
  runtimeProfile: RuntimeProfile | null;
  nodeProvider: NodeProvider | null;
  hasApiKey: boolean;
  effectiveHasApiKey: boolean;
  apiKeySource: "saved" | "system" | "none";
}

export interface ToolState {
  descriptor: ToolDescriptor;
  installStatus: InstallStatus;
  config: ToolConfigView;
}

export interface SessionRecord {
  sessionId: string;
  workspacePath: string;
  toolId: string;
  runtimeProfile: RuntimeProfile;
  nodeProvider: NodeProvider;
  model: string | null;
  windowId: string;
  createdAt: string;
  lastOpenedAt: string;
  lastExitCode: number | null;
  status: SessionStatus;
  title: string;
  commandPreview: string;
}

export interface WindowSessionState {
  windowId: string;
  activeSessionId: string | null;
  sidebarSelection: string | null;
  terminalLayout: string;
}

export interface ManagedNodeState {
  installed: boolean;
  version: string | null;
  rootDir: string;
  npmPrefix: string;
}

export interface DockerStatus {
  installed: boolean;
  running: boolean;
  version: string | null;
  detail: string | null;
}

export interface DiagnosticsSnapshot {
  platform: string;
  windowsBuildNumber: number | null;
  systemNodeVersion: string | null;
  managedNode: ManagedNodeState;
  docker: DockerStatus;
}

export interface BootstrapSnapshot {
  tools: ToolState[];
  sessions: SessionRecord[];
  windowState: WindowSessionState;
  diagnostics: DiagnosticsSnapshot;
}

export interface LaunchSessionRequest {
  workspacePath: string;
  toolId: string;
  windowId: string;
  model?: string | null;
  runtimeProfile?: RuntimeProfile | null;
  nodeProvider?: NodeProvider | null;
}

export interface SaveToolConfigRequest {
  toolId: string;
  providerUrl?: string | null;
  apiKey?: string | null;
  model?: string | null;
  runtimeProfile?: RuntimeProfile | null;
  nodeProvider?: NodeProvider | null;
}

export interface InstallActionRequest {
  toolId: string;
  action: "install" | "update" | "repair" | "uninstall";
}

export interface InstallActionResult {
  toolId: string;
  action: string;
  success: boolean;
  log: string;
  installStatus: InstallStatus;
}

export interface InstallProgressEvent {
  toolId: string;
  action: string;
  stream: string;
  message: string;
}

export interface SessionOutputEvent {
  sessionId: string;
  data: string;
}

export interface SessionExitEvent {
  sessionId: string;
  exitCode: number | null;
}
