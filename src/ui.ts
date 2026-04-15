import type { SessionStatus } from "./types";

export type LanguageChoice = "system" | "zh-CN" | "zh-TW" | "en";
export type UiLocale = "zh-CN" | "zh-TW" | "en";
export type ThemeMode = "dark" | "light";
export type ConfigSource = "saved" | "system" | "default" | "none";
export type ApiKeySource = "saved" | "system" | "none";

type ToolAction = "install" | "update" | "repair" | "uninstall";

export interface UiCopy {
  common: {
    close: string;
    refresh: string;
    processing: string;
    genericError: string;
    waitingOutput: string;
    pageMissing: string;
  };
  titlebar: {
    file: string;
    help: string;
    window: string;
    newWindow: string;
    minimize: string;
    maximize: string;
    closeWindow: string;
    pages: Record<"new-session" | "install" | "config" | "settings", string>;
  };
  page: {
    title: Record<"new-session" | "install" | "config" | "settings", string>;
    subtitle: Record<"new-session" | "install" | "config" | "settings", string>;
  };
  sidebar: {
    sessions: string;
    noSessions: string;
    actionStart: string;
    actionStop: string;
    actionStarting: string;
    status: Record<SessionStatus, string>;
  };
  picker: {
    eyebrow: string;
    title: string;
    createSession: string;
    autoInstallAndCreate: string;
    installed: string;
    notInstalled: string;
  };
  terminal: {
    clearOutput: string;
    startingCli: string;
    connectingTerminal: string;
    launchCommand: string;
  };
  install: {
    installed: string;
    notInstalled: string;
    statusIdle: string;
    statusRunning: string;
    statusSuccess: string;
    statusError: string;
    titleForAction: Record<ToolAction | "default", string>;
    actionLabel: Record<ToolAction | "default", string>;
    actionButton: {
      install: string;
      update: string;
      repair: string;
      uninstall: string;
    };
    actionResult: Record<ToolAction | "default", string>;
  };
  config: {
    currentTool: string;
    providerUrl: string;
    apiKey: string;
    clearStoredKey: string;
    model: string;
    runtime: string;
    nodeProvider: string;
    managedNode: string;
    systemNode: string;
    save: string;
    saving: string;
    noTools: string;
    providerPlaceholder: string;
    keyPlaceholderSaved: string;
    keyPlaceholderEmpty: string;
    modelPlaceholder: string;
    officialLogin: (enabled: boolean) => string;
    effectiveConfig: string;
    effectiveProviderUrl: string;
    effectiveApiKey: string;
    providerSource: string;
    apiKeySource: string;
    unsetValue: string;
    keyAvailable: string;
    keyMissing: string;
    sourceSaved: string;
    sourceSystem: string;
    sourceDefault: string;
    sourceNone: string;
    inheritHint: string;
  };
  settings: {
    appearance: string;
    language: string;
    theme: string;
    fonts: string;
    uiFont: string;
    uiFontSize: string;
    terminalFont: string;
    terminalFontSize: string;
    environment: string;
    platform: string;
    systemNode: string;
    managedNode: string;
    docker: string;
    actions: string;
    prepareManagedNode: string;
    preparingManagedNode: string;
    recheckEnvironment: string;
    languageChoices: Record<LanguageChoice, string>;
    themeChoices: Record<ThemeMode, string>;
    managedNodeReady: (version: string | null) => string;
    dockerUnavailable: string;
    dockerInstalledButUnavailable: string;
    environmentChecking: string;
    environmentMissing: string;
    environmentNotReady: string;
  };
  help: {
    title: string;
    description: string;
    version: string;
    author: string;
    stack: string;
    integrated: string;
    position: string;
    values: {
      version: string;
      author: string;
      stack: string;
      integrated: string;
      position: string;
    };
  };
  activity: {
    creatingSession: (workspace: string, tool: string) => string;
    autoInstallingTool: (tool: string) => string;
    sessionCreatedStarting: (tool: string) => string;
    sessionStarted: (title: string) => string;
    sessionStopped: string;
    configSaved: (tool: string) => string;
    windowOpened: string;
    installingTool: (action: string, tool: string) => string;
  };
}

const COPY: Record<UiLocale, UiCopy> = {
  "zh-CN": {
    common: {
      close: "关闭",
      refresh: "刷新",
      processing: "处理中...",
      genericError: "发生了一点问题。",
      waitingOutput: "等待安装输出...",
      pageMissing: "还没有可配置的工具。",
    },
    titlebar: {
      file: "文件",
      help: "帮助",
      window: "窗口",
      newWindow: "新窗口",
      minimize: "最小化窗口",
      maximize: "最大化窗口",
      closeWindow: "关闭窗口",
      pages: {
        "new-session": "新会话",
        install: "安装",
        config: "配置",
        settings: "设置",
      },
    },
    page: {
      title: {
        "new-session": "新会话",
        install: "安装",
        config: "配置",
        settings: "设置",
      },
      subtitle: {
        "new-session": "先选目录，再选 CLI。如果工具未安装，会自动下载。",
        install: "查看已安装和未安装的 CLI，并支持自动下载、更新和修复。",
        config: "统一维护 URL、Key、模型、运行时和 Node 来源。",
        settings: "管理语言、主题、字体以及环境状态。",
      },
    },
    sidebar: {
      sessions: "会话",
      noSessions: "还没有会话。点击“文件 > 新会话”开始。",
      actionStart: "启动",
      actionStop: "停止",
      actionStarting: "启动中",
      status: {
        starting: "启动中",
        running: "运行中",
        stopped: "已停止",
        exited: "已退出",
        error: "异常",
      },
    },
    picker: {
      eyebrow: "新会话",
      title: "为这个目录选择一个 CLI",
      createSession: "创建会话",
      autoInstallAndCreate: "自动安装并创建",
      installed: "已安装",
      notInstalled: "未安装",
    },
    terminal: {
      clearOutput: "清空输出",
      startingCli: "正在启动 CLI...",
      connectingTerminal: "正在连接真实终端...",
      launchCommand: "启动命令",
    },
    install: {
      installed: "已安装",
      notInstalled: "未安装",
      statusIdle: "待命",
      statusRunning: "进行中",
      statusSuccess: "已完成",
      statusError: "失败",
      titleForAction: {
        install: "安装日志",
        update: "更新日志",
        repair: "修复日志",
        uninstall: "移除日志",
        default: "安装日志",
      },
      actionLabel: {
        install: "正在安装",
        update: "正在更新",
        repair: "正在修复",
        uninstall: "正在移除",
        default: "正在执行",
      },
      actionButton: {
        install: "安装",
        update: "更新",
        repair: "修复",
        uninstall: "移除",
      },
      actionResult: {
        install: "安装完成",
        update: "更新完成",
        repair: "修复完成",
        uninstall: "已移除",
        default: "已完成",
      },
    },
    config: {
      currentTool: "当前工具",
      providerUrl: "Provider URL",
      apiKey: "API Key",
      clearStoredKey: "保存时清空已存储的 Key",
      model: "模型",
      runtime: "运行时",
      nodeProvider: "Node 来源",
      managedNode: "托管 Node",
      systemNode: "系统 Node",
      save: "保存配置",
      saving: "保存中...",
      noTools: "还没有可配置的工具。",
      providerPlaceholder: "https://api.example.com/v1",
      keyPlaceholderSaved: "已保存。留空则保持不变。",
      keyPlaceholderEmpty: "填写服务 Key",
      modelPlaceholder: "模型 ID",
      officialLogin: (enabled) => `官方登录：${enabled ? "当前已预留接入位" : "当前未启用"}`,
      effectiveConfig: "当前生效配置",
      effectiveProviderUrl: "当前 URL",
      effectiveApiKey: "当前 Key",
      providerSource: "URL 来源",
      apiKeySource: "Key 来源",
      unsetValue: "未设置",
      keyAvailable: "已存在",
      keyMissing: "未设置",
      sourceSaved: "CliHub 保存",
      sourceSystem: "本机配置",
      sourceDefault: "默认值",
      sourceNone: "无",
      inheritHint: "输入框留空时，会继续使用本机配置或工具默认值。",
    },
    settings: {
      appearance: "外观",
      language: "语言",
      theme: "主题颜色",
      fonts: "字体",
      uiFont: "界面字体",
      uiFontSize: "界面字号",
      terminalFont: "终端字体",
      terminalFontSize: "终端字号",
      environment: "环境状态",
      platform: "平台",
      systemNode: "系统 Node",
      managedNode: "托管 Node",
      docker: "Docker",
      actions: "常用操作",
      prepareManagedNode: "准备托管 Node",
      preparingManagedNode: "准备中...",
      recheckEnvironment: "重新检测环境",
      languageChoices: {
        system: "跟随系统",
        "zh-CN": "简体中文",
        "zh-TW": "繁體中文",
        en: "English",
      },
      themeChoices: {
        dark: "深色模式（紫 + 黑）",
        light: "浅色模式（紫 + 白）",
      },
      managedNodeReady: (version) => (version ? `托管 Node ${version} 已就绪。` : "托管 Node 已就绪。"),
      dockerUnavailable: "未安装",
      dockerInstalledButUnavailable: "已安装，但服务不可用",
      environmentChecking: "检测中...",
      environmentMissing: "未发现",
      environmentNotReady: "未准备",
    },
    help: {
      title: "软件信息",
      description: "面向 CLI coding agents 的桌面工作台，用来统一管理多会话、多工具和本机真实终端。",
      version: "版本型号",
      author: "作者",
      stack: "技术栈",
      integrated: "已接入",
      position: "定位",
      values: {
        version: "0.1.5",
        author: "https://github.com/weirens/clihub.git",
        stack: "Tauri 2 + React + TypeScript + Rust",
        integrated: "Codex / Claude Code / Gemini CLI / OpenCode",
        position: "多会话 CLI 工作台",
      },
    },
    activity: {
      creatingSession: (workspace, tool) => `正在为 ${workspace} 创建 ${tool} 会话...`,
      autoInstallingTool: (tool) => `${tool} 未安装，正在自动下载并安装...`,
      sessionCreatedStarting: (tool) => `会话已创建，${tool} 正在启动。`,
      sessionStarted: (title) => `已启动 ${title}。`,
      sessionStopped: "会话已停止。",
      configSaved: (tool) => `${tool} 配置已保存。`,
      windowOpened: "已打开新的工作窗口。",
      installingTool: (action, tool) => `${action} ${tool}...`,
    },
  },
  "zh-TW": {
    common: {
      close: "關閉",
      refresh: "重新整理",
      processing: "處理中...",
      genericError: "發生了一點問題。",
      waitingOutput: "等待安裝輸出...",
      pageMissing: "還沒有可設定的工具。",
    },
    titlebar: {
      file: "檔案",
      help: "說明",
      window: "視窗",
      newWindow: "新視窗",
      minimize: "最小化視窗",
      maximize: "最大化視窗",
      closeWindow: "關閉視窗",
      pages: {
        "new-session": "新會話",
        install: "安裝",
        config: "設定",
        settings: "偏好設定",
      },
    },
    page: {
      title: {
        "new-session": "新會話",
        install: "安裝",
        config: "設定",
        settings: "偏好設定",
      },
      subtitle: {
        "new-session": "先選目錄，再選 CLI。如果工具尚未安裝，會自動下載。",
        install: "檢視已安裝與未安裝的 CLI，並支援自動下載、更新與修復。",
        config: "統一維護 URL、Key、模型、執行時與 Node 來源。",
        settings: "管理語言、主題、字體與環境狀態。",
      },
    },
    sidebar: {
      sessions: "會話",
      noSessions: "還沒有會話。點擊「檔案 > 新會話」開始。",
      actionStart: "啟動",
      actionStop: "停止",
      actionStarting: "啟動中",
      status: {
        starting: "啟動中",
        running: "執行中",
        stopped: "已停止",
        exited: "已結束",
        error: "異常",
      },
    },
    picker: {
      eyebrow: "新會話",
      title: "為這個目錄選擇一個 CLI",
      createSession: "建立會話",
      autoInstallAndCreate: "自動安裝並建立",
      installed: "已安裝",
      notInstalled: "未安裝",
    },
    terminal: {
      clearOutput: "清空輸出",
      startingCli: "正在啟動 CLI...",
      connectingTerminal: "正在連接真實終端...",
      launchCommand: "啟動命令",
    },
    install: {
      installed: "已安裝",
      notInstalled: "未安裝",
      statusIdle: "待命",
      statusRunning: "進行中",
      statusSuccess: "已完成",
      statusError: "失敗",
      titleForAction: {
        install: "安裝日誌",
        update: "更新日誌",
        repair: "修復日誌",
        uninstall: "移除日誌",
        default: "安裝日誌",
      },
      actionLabel: {
        install: "正在安裝",
        update: "正在更新",
        repair: "正在修復",
        uninstall: "正在移除",
        default: "正在執行",
      },
      actionButton: {
        install: "安裝",
        update: "更新",
        repair: "修復",
        uninstall: "移除",
      },
      actionResult: {
        install: "安裝完成",
        update: "更新完成",
        repair: "修復完成",
        uninstall: "已移除",
        default: "已完成",
      },
    },
    config: {
      currentTool: "目前工具",
      providerUrl: "Provider URL",
      apiKey: "API Key",
      clearStoredKey: "儲存時清除已儲存的 Key",
      model: "模型",
      runtime: "執行時",
      nodeProvider: "Node 來源",
      managedNode: "託管 Node",
      systemNode: "系統 Node",
      save: "儲存設定",
      saving: "儲存中...",
      noTools: "還沒有可設定的工具。",
      providerPlaceholder: "https://api.example.com/v1",
      keyPlaceholderSaved: "已儲存。留空則保持不變。",
      keyPlaceholderEmpty: "填寫服務 Key",
      modelPlaceholder: "模型 ID",
      officialLogin: (enabled) => `官方登入：${enabled ? "已預留接入位置" : "目前未啟用"}`,
      effectiveConfig: "目前生效設定",
      effectiveProviderUrl: "目前 URL",
      effectiveApiKey: "目前 Key",
      providerSource: "URL 來源",
      apiKeySource: "Key 來源",
      unsetValue: "未設定",
      keyAvailable: "已存在",
      keyMissing: "未設定",
      sourceSaved: "CliHub 儲存",
      sourceSystem: "本機設定",
      sourceDefault: "預設值",
      sourceNone: "無",
      inheritHint: "輸入框留空時，會繼續使用本機設定或工具預設值。",
    },
    settings: {
      appearance: "外觀",
      language: "語言",
      theme: "主題色彩",
      fonts: "字體",
      uiFont: "介面字體",
      uiFontSize: "介面字級",
      terminalFont: "終端字體",
      terminalFontSize: "終端字級",
      environment: "環境狀態",
      platform: "平台",
      systemNode: "系統 Node",
      managedNode: "託管 Node",
      docker: "Docker",
      actions: "常用操作",
      prepareManagedNode: "準備託管 Node",
      preparingManagedNode: "準備中...",
      recheckEnvironment: "重新檢測環境",
      languageChoices: {
        system: "跟隨系統",
        "zh-CN": "简体中文",
        "zh-TW": "繁體中文",
        en: "English",
      },
      themeChoices: {
        dark: "深色模式（紫 + 黑）",
        light: "淺色模式（紫 + 白）",
      },
      managedNodeReady: (version) => (version ? `託管 Node ${version} 已就緒。` : "託管 Node 已就緒。"),
      dockerUnavailable: "未安裝",
      dockerInstalledButUnavailable: "已安裝，但服務不可用",
      environmentChecking: "檢測中...",
      environmentMissing: "未發現",
      environmentNotReady: "未準備",
    },
    help: {
      title: "軟體資訊",
      description: "面向 CLI coding agents 的桌面工作台，用來統一管理多會話、多工具與本機真實終端。",
      version: "版本型號",
      author: "作者",
      stack: "技術棧",
      integrated: "已接入",
      position: "定位",
      values: {
        version: "0.1.5",
        author: "https://github.com/weirens/clihub.git",
        stack: "Tauri 2 + React + TypeScript + Rust",
        integrated: "Codex / Claude Code / Gemini CLI / OpenCode",
        position: "多會話 CLI 工作台",
      },
    },
    activity: {
      creatingSession: (workspace, tool) => `正在為 ${workspace} 建立 ${tool} 會話...`,
      autoInstallingTool: (tool) => `${tool} 尚未安裝，正在自動下載並安裝...`,
      sessionCreatedStarting: (tool) => `會話已建立，${tool} 正在啟動。`,
      sessionStarted: (title) => `已啟動 ${title}。`,
      sessionStopped: "會話已停止。",
      configSaved: (tool) => `${tool} 設定已儲存。`,
      windowOpened: "已開啟新的工作視窗。",
      installingTool: (action, tool) => `${action} ${tool}...`,
    },
  },
  en: {
    common: {
      close: "Close",
      refresh: "Refresh",
      processing: "Processing...",
      genericError: "Something went wrong.",
      waitingOutput: "Waiting for installer output...",
      pageMissing: "No configurable tools are available yet.",
    },
    titlebar: {
      file: "File",
      help: "Help",
      window: "Window",
      newWindow: "New Window",
      minimize: "Minimize window",
      maximize: "Maximize window",
      closeWindow: "Close window",
      pages: {
        "new-session": "New Session",
        install: "Install",
        config: "Config",
        settings: "Settings",
      },
    },
    page: {
      title: {
        "new-session": "New Session",
        install: "Install",
        config: "Config",
        settings: "Settings",
      },
      subtitle: {
        "new-session": "Pick a workspace, then choose a CLI. Missing tools are installed automatically.",
        install: "View installed CLIs and run install, update, repair, or uninstall actions.",
        config: "Manage URL, key, model, runtime profile, and Node source in one place.",
        settings: "Manage language, theme, fonts, and local environment status.",
      },
    },
    sidebar: {
      sessions: "Sessions",
      noSessions: "No sessions yet. Use File > New Session to get started.",
      actionStart: "Start",
      actionStop: "Stop",
      actionStarting: "Starting",
      status: {
        starting: "Starting",
        running: "Running",
        stopped: "Stopped",
        exited: "Exited",
        error: "Error",
      },
    },
    picker: {
      eyebrow: "New Session",
      title: "Choose a CLI for this folder",
      createSession: "Create session",
      autoInstallAndCreate: "Auto-install and create",
      installed: "Installed",
      notInstalled: "Not installed",
    },
    terminal: {
      clearOutput: "Clear output",
      startingCli: "Starting CLI...",
      connectingTerminal: "Connecting to the real terminal...",
      launchCommand: "Launch command",
    },
    install: {
      installed: "Installed",
      notInstalled: "Not installed",
      statusIdle: "Idle",
      statusRunning: "Running",
      statusSuccess: "Completed",
      statusError: "Failed",
      titleForAction: {
        install: "Install Log",
        update: "Update Log",
        repair: "Repair Log",
        uninstall: "Uninstall Log",
        default: "Install Log",
      },
      actionLabel: {
        install: "Installing",
        update: "Updating",
        repair: "Repairing",
        uninstall: "Removing",
        default: "Working",
      },
      actionButton: {
        install: "Install",
        update: "Update",
        repair: "Repair",
        uninstall: "Remove",
      },
      actionResult: {
        install: "Install completed",
        update: "Update completed",
        repair: "Repair completed",
        uninstall: "Removed",
        default: "Completed",
      },
    },
    config: {
      currentTool: "Current Tool",
      providerUrl: "Provider URL",
      apiKey: "API Key",
      clearStoredKey: "Clear the stored key when saving",
      model: "Model",
      runtime: "Runtime",
      nodeProvider: "Node Source",
      managedNode: "Managed Node",
      systemNode: "System Node",
      save: "Save Config",
      saving: "Saving...",
      noTools: "No configurable tools are available yet.",
      providerPlaceholder: "https://api.example.com/v1",
      keyPlaceholderSaved: "Already saved. Leave blank to keep it.",
      keyPlaceholderEmpty: "Enter the service key",
      modelPlaceholder: "Model ID",
      officialLogin: (enabled) => `Official sign-in: ${enabled ? "integration hook is reserved" : "not enabled"}`,
      effectiveConfig: "Effective Runtime Config",
      effectiveProviderUrl: "Current URL",
      effectiveApiKey: "Current Key",
      providerSource: "URL Source",
      apiKeySource: "Key Source",
      unsetValue: "Not set",
      keyAvailable: "Available",
      keyMissing: "Not set",
      sourceSaved: "Saved in CliHub",
      sourceSystem: "Read from local config",
      sourceDefault: "Default",
      sourceNone: "None",
      inheritHint: "When left blank, CliHub keeps using the local CLI config or the tool default.",
    },
    settings: {
      appearance: "Appearance",
      language: "Language",
      theme: "Theme",
      fonts: "Fonts",
      uiFont: "UI Font",
      uiFontSize: "UI Size",
      terminalFont: "Terminal Font",
      terminalFontSize: "Terminal Size",
      environment: "Environment",
      platform: "Platform",
      systemNode: "System Node",
      managedNode: "Managed Node",
      docker: "Docker",
      actions: "Actions",
      prepareManagedNode: "Prepare Managed Node",
      preparingManagedNode: "Preparing...",
      recheckEnvironment: "Recheck Environment",
      languageChoices: {
        system: "Follow system",
        "zh-CN": "Simplified Chinese",
        "zh-TW": "Traditional Chinese",
        en: "English",
      },
      themeChoices: {
        dark: "Dark mode (Purple + Black)",
        light: "Light mode (Purple + White)",
      },
      managedNodeReady: (version) => (version ? `Managed Node ${version} is ready.` : "Managed Node is ready."),
      dockerUnavailable: "Not installed",
      dockerInstalledButUnavailable: "Installed, but the daemon is unreachable",
      environmentChecking: "Checking...",
      environmentMissing: "Not found",
      environmentNotReady: "Not ready",
    },
    help: {
      title: "About",
      description: "A desktop workspace for CLI coding agents, built to manage multiple sessions, tools, and the real local terminal.",
      version: "Version / Build",
      author: "Author",
      stack: "Stack",
      integrated: "Integrated",
      position: "Positioning",
      values: {
        version: "0.1.5",
        author: "https://github.com/weirens/clihub.git",
        stack: "Tauri 2 + React + TypeScript + Rust",
        integrated: "Codex / Claude Code / Gemini CLI / OpenCode",
        position: "Multi-session CLI workspace",
      },
    },
    activity: {
      creatingSession: (workspace, tool) => `Creating a ${tool} session for ${workspace}...`,
      autoInstallingTool: (tool) => `${tool} is missing. Installing it automatically...`,
      sessionCreatedStarting: (tool) => `Session created. ${tool} is starting.`,
      sessionStarted: (title) => `${title} is running.`,
      sessionStopped: "Session stopped.",
      configSaved: (tool) => `${tool} config saved.`,
      windowOpened: "A new workspace window was opened.",
      installingTool: (action, tool) => `${action} ${tool}...`,
    },
  },
};

export function getUiCopy(locale: UiLocale) {
  return COPY[locale];
}

export function detectSystemLocale(): UiLocale {
  if (typeof window === "undefined") {
    return "en";
  }

  const candidates = [
    ...window.navigator.languages,
    window.navigator.language,
    new Intl.DateTimeFormat().resolvedOptions().locale,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = candidate.replace(/_/g, "-");
    const parts = normalized.split("-");
    const region = parts.find((part, index) => index > 0 && /^[a-z]{2}$/i.test(part))?.toUpperCase();

    if (region === "CN") {
      return "zh-CN";
    }
    if (region === "TW" || region === "HK" || region === "MO") {
      return "zh-TW";
    }
  }

  return "en";
}

export function resolveLocale(choice: LanguageChoice): UiLocale {
  return choice === "system" ? detectSystemLocale() : choice;
}

export function formatTimestamp(value: string, locale: UiLocale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(locale);
}

export function configSourceLabel(copy: UiCopy, source: ConfigSource) {
  switch (source) {
    case "saved":
      return copy.config.sourceSaved;
    case "system":
      return copy.config.sourceSystem;
    case "default":
      return copy.config.sourceDefault;
    default:
      return copy.config.sourceNone;
  }
}

export function apiKeySourceLabel(copy: UiCopy, source: ApiKeySource) {
  switch (source) {
    case "saved":
      return copy.config.sourceSaved;
    case "system":
      return copy.config.sourceSystem;
    default:
      return copy.config.sourceNone;
  }
}

export function installStatusLabel(copy: UiCopy, status: "idle" | "running" | "success" | "error") {
  switch (status) {
    case "running":
      return copy.install.statusRunning;
    case "success":
      return copy.install.statusSuccess;
    case "error":
      return copy.install.statusError;
    default:
      return copy.install.statusIdle;
  }
}
