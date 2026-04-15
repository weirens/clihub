interface NavigationRailProps {
  busyAction: string | null;
  onCreateWindow: () => Promise<void>;
}

const PRIMARY_ITEMS = [
  { id: "new", label: "新线程", hint: "创建新的工作窗口" },
  { id: "search", label: "搜索", hint: "后续可接入全局检索" },
  { id: "tools", label: "工具中心", hint: "管理四个 CLI 的安装与更新" },
  { id: "automation", label: "自动化", hint: "预留给后续任务流和模板" },
];

export function NavigationRail({ busyAction, onCreateWindow }: NavigationRailProps) {
  return (
    <aside className="navigation-rail">
      <div className="brand-lockup">
        <div className="brand-badge">C</div>
        <div>
          <p>CliHub</p>
          <span>Desktop</span>
        </div>
      </div>

      <nav className="rail-nav">
        {PRIMARY_ITEMS.map((item, index) => (
          <button
            className={`rail-item ${index === 0 ? "active" : ""}`}
            key={item.id}
            onClick={index === 0 ? () => void onCreateWindow() : undefined}
            disabled={index === 0 && busyAction === "window"}
            title={item.hint}
            type="button"
          >
            <span className="rail-dot" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="rail-spacer" />

      <div className="rail-footer">
        <p className="rail-section-title">当前工作区</p>
        <button className="rail-item active secondary" type="button">
          <span className="rail-dot" />
          <span>Cli</span>
        </button>
        <button className="rail-item secondary" type="button">
          <span className="rail-dot" />
          <span>设置</span>
        </button>
      </div>
    </aside>
  );
}
