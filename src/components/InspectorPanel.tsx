import type { NodeProvider, RuntimeProfile, ToolState } from "../types";

interface InspectorPanelProps {
  busyAction: string | null;
  clearStoredKey: boolean;
  configApiKey: string;
  configModel: string;
  configNodeProvider: NodeProvider;
  configProviderUrl: string;
  configRuntimeProfile: RuntimeProfile;
  editorTool: ToolState | null;
  editorToolId: string;
  onInstallAction: (toolId: string, action: "install" | "update" | "repair" | "uninstall") => Promise<void>;
  onSaveConfig: () => Promise<void>;
  setClearStoredKey: (value: boolean) => void;
  setConfigApiKey: (value: string) => void;
  setConfigModel: (value: string) => void;
  setConfigNodeProvider: (value: NodeProvider) => void;
  setConfigProviderUrl: (value: string) => void;
  setConfigRuntimeProfile: (value: RuntimeProfile) => void;
  setEditorToolId: (value: string) => void;
  tools: ToolState[];
}

export function InspectorPanel(props: InspectorPanelProps) {
  const {
    busyAction,
    clearStoredKey,
    configApiKey,
    configModel,
    configNodeProvider,
    configProviderUrl,
    configRuntimeProfile,
    editorTool,
    editorToolId,
    onInstallAction,
    onSaveConfig,
    setClearStoredKey,
    setConfigApiKey,
    setConfigModel,
    setConfigNodeProvider,
    setConfigProviderUrl,
    setConfigRuntimeProfile,
    setEditorToolId,
    tools,
  } = props;

  return (
    <aside className="inspector">
      <article className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">工具中心</p>
            <h2>安装、修复和更新已接入的 CLI</h2>
          </div>
        </div>
        <div className="tool-list">
          {tools.map((tool) => (
            <section className={`tool-card ${editorToolId === tool.descriptor.id ? "focused" : ""}`} key={tool.descriptor.id}>
              <div className="tool-card-header">
                <div>
                  <button className="link-button" onClick={() => setEditorToolId(tool.descriptor.id)}>
                    {tool.descriptor.displayName}
                  </button>
                  <p>{tool.descriptor.description}</p>
                </div>
                <span className={`install-pill ${tool.installStatus.installed ? "installed" : "missing"}`}>
                  {tool.installStatus.installed ? tool.installStatus.version ?? "已安装" : "未安装"}
                </span>
              </div>
              <div className="tool-card-meta">
                <span>Runtime: {tool.config.runtimeProfile ?? tool.descriptor.recommendedProfiles[0]}</span>
                <span>Node: {tool.config.nodeProvider ?? "managed"}</span>
              </div>
              <div className="tool-actions">
                <button
                  className="ghost-button compact"
                  onClick={() => void onInstallAction(tool.descriptor.id, tool.installStatus.installed ? "update" : "install")}
                  disabled={busyAction === `install:${tool.descriptor.id}` || busyAction === `update:${tool.descriptor.id}`}
                >
                  {tool.installStatus.installed ? "更新" : "安装"}
                </button>
                <button
                  className="ghost-button compact"
                  onClick={() => void onInstallAction(tool.descriptor.id, "repair")}
                  disabled={busyAction === `repair:${tool.descriptor.id}`}
                >
                  修复
                </button>
                <button
                  className="ghost-button compact danger"
                  onClick={() => void onInstallAction(tool.descriptor.id, "uninstall")}
                  disabled={busyAction === `uninstall:${tool.descriptor.id}`}
                >
                  移除
                </button>
              </div>
            </section>
          ))}
        </div>
      </article>

      <article className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">配置</p>
            <h2>{editorTool?.descriptor.displayName ?? "工具设置"}</h2>
          </div>
          <select value={editorToolId} onChange={(event) => setEditorToolId(event.currentTarget.value)}>
            {tools.map((tool) => (
              <option key={tool.descriptor.id} value={tool.descriptor.id}>
                {tool.descriptor.displayName}
              </option>
            ))}
          </select>
        </div>
        {editorTool ? (
          <div className="config-form">
            <label className="field">
              <span>Provider URL</span>
              <input
                value={configProviderUrl}
                onChange={(event) => setConfigProviderUrl(event.currentTarget.value)}
                placeholder={
                  editorTool.descriptor.supportsCustomBaseUrl
                    ? "https://api.example.com/v1"
                    : "可选。这个 CLI 对自定义 URL 的支持较弱。"
                }
              />
            </label>
            <label className="field">
              <span>API Key</span>
              <input
                type="password"
                value={configApiKey}
                onChange={(event) => setConfigApiKey(event.currentTarget.value)}
                placeholder={
                  editorTool.config.hasApiKey
                    ? "已保存。留空则保持不变。"
                    : "填写服务提供方的 Key"
                }
              />
            </label>
            <label className="checkbox-field">
              <input checked={clearStoredKey} onChange={(event) => setClearStoredKey(event.currentTarget.checked)} type="checkbox" />
              <span>保存时清空已存储的 Key</span>
            </label>
            <label className="field">
              <span>模型</span>
              <input value={configModel} onChange={(event) => setConfigModel(event.currentTarget.value)} placeholder="模型 ID" />
            </label>
            <div className="two-column">
              <label className="field">
                <span>运行时</span>
                <select
                  value={configRuntimeProfile}
                  onChange={(event) => setConfigRuntimeProfile(event.currentTarget.value as RuntimeProfile)}
                >
                  {editorTool.descriptor.recommendedProfiles.map((profile) => (
                    <option key={profile} value={profile}>
                      {profile}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Node 来源</span>
                <select
                  value={configNodeProvider}
                  onChange={(event) => setConfigNodeProvider(event.currentTarget.value as NodeProvider)}
                >
                  <option value="managed">托管 Node</option>
                  <option value="system">系统 Node</option>
                </select>
              </label>
            </div>
            <div className="config-note">
              <p>{editorTool.installStatus.detail}</p>
              <p>
                官方登录：{editorTool.descriptor.supportsOfficialLogin ? "适配入口已预留" : "当前未启用"}
              </p>
            </div>
            <button
              className="primary-button"
              onClick={() => void onSaveConfig()}
              disabled={busyAction === `config:${editorTool.descriptor.id}`}
            >
              {busyAction === `config:${editorTool.descriptor.id}` ? "保存中..." : "保存设置"}
            </button>
          </div>
        ) : (
          <p className="muted-copy">还没有可配置的工具。</p>
        )}
      </article>
    </aside>
  );
}
