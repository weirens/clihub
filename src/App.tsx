import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { open } from "@tauri-apps/plugin-dialog";
import type { CSSProperties } from "react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "./App.css";
import { CliPickerModal } from "./components/CliPickerModal";
import { HelpModal } from "./components/HelpModal";
import { Sidebar, type PageId } from "./components/Sidebar";
import { TerminalWorkbench } from "./components/TerminalWorkbench";
import { WindowTitlebar } from "./components/WindowTitlebar";
import {
  bootstrapApp,
  createWorkspaceWindow,
  ensureManagedNode,
  launchSession,
  relaunchExistingSession,
  resizeSession,
  runInstallAction,
  saveToolConfig,
  setActiveSession,
  stopSession,
  writeSessionInput,
} from "./lib/api";
import type {
  BootstrapSnapshot,
  InstallActionRequest,
  InstallProgressEvent,
  NodeProvider,
  RuntimeProfile,
  SaveToolConfigRequest,
  SessionExitEvent,
  SessionOutputEvent,
  SessionRecord,
  ToolState,
} from "./types";
import {
  apiKeySourceLabel,
  configSourceLabel,
  getUiCopy,
  installStatusLabel as localizedInstallStatusLabel,
  resolveLocale,
  type LanguageChoice,
  type ThemeMode,
} from "./ui";

const MAX_BUFFER = 200_000;
const currentWindow = getCurrentWebviewWindow();
const windowLabel = currentWindow.label;
const UI_FONT_PRESETS = [
  { id: "system", label: "系统默认", family: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif' },
  { id: "plex", label: "IBM Plex Sans", family: '"IBM Plex Sans", "Segoe UI", "PingFang SC", sans-serif' },
  { id: "display", label: "Space Grotesk", family: '"Space Grotesk", "Segoe UI", "PingFang SC", sans-serif' },
] as const;
const TERMINAL_FONT_PRESETS = [
  { id: "plex-mono", label: "IBM Plex Mono", family: '"IBM Plex Mono", "Cascadia Mono", Consolas, "NSimSun", monospace' },
  { id: "cascadia", label: "Cascadia Mono", family: '"Cascadia Mono", "Cascadia Code", Consolas, "NSimSun", monospace' },
  { id: "jetbrains", label: '"JetBrains Mono"', family: '"JetBrains Mono", "Cascadia Mono", Consolas, "NSimSun", monospace' },
] as const;
const THEME_TOKENS: Record<ThemeMode, Record<string, string>> = {
  dark: {
    "--window-titlebar-bg": "linear-gradient(180deg, rgba(21, 15, 36, 0.82), rgba(7, 8, 12, 0.76))",
    "--window-menu-bg": "linear-gradient(180deg, rgba(24, 18, 40, 0.94), rgba(10, 10, 14, 0.92))",
    "--window-hover-bg": "rgba(255, 255, 255, 0.08)",
    "--window-border": "rgba(255, 255, 255, 0.08)",
    "--shell-bg":
      "linear-gradient(90deg, rgba(117, 101, 163, 0.38) 0%, rgba(72, 62, 103, 0.26) 16%, rgba(19, 18, 28, 0.74) 34%, rgba(10, 11, 15, 0.92) 58%, rgba(6, 7, 9, 0.98) 100%)",
    "--sidebar-bg":
      "linear-gradient(180deg, rgba(18, 17, 28, 0.58), rgba(9, 10, 14, 0.42))",
    "--sidebar-border": "rgba(186, 173, 225, 0.12)",
    "--panel-bg": "linear-gradient(180deg, rgba(16, 17, 22, 0.68), rgba(9, 10, 14, 0.62))",
    "--panel-soft-bg": "rgba(255, 255, 255, 0.045)",
    "--panel-strong-bg": "rgba(255, 255, 255, 0.03)",
    "--panel-border": "rgba(255, 255, 255, 0.08)",
    "--text-primary": "#e8ebf3",
    "--text-secondary": "#9aa2af",
    "--text-tertiary": "#7f8693",
    "--text-contrast": "#fbfcfe",
    "--button-bg": "rgba(255, 255, 255, 0.04)",
    "--button-border": "rgba(255, 255, 255, 0.08)",
    "--button-primary-bg": "linear-gradient(135deg, rgba(109, 72, 196, 0.94), rgba(34, 26, 54, 0.94))",
    "--button-primary-border": "rgba(196, 178, 255, 0.14)",
    "--active-bg": "rgba(255, 255, 255, 0.08)",
    "--badge-bg": "rgba(12, 13, 18, 0.72)",
    "--input-bg": "rgba(7, 8, 12, 0.68)",
    "--input-border": "rgba(224, 217, 244, 0.12)",
    "--input-focus": "rgba(208, 194, 246, 0.34)",
    "--terminal-frame-bg":
      "linear-gradient(180deg, rgba(7, 8, 10, 0.99), rgba(3, 4, 5, 1)), radial-gradient(circle at top right, rgba(145, 95, 255, 0.08), transparent 28%)",
    "--terminal-bg": "#090b0d",
    "--terminal-fg": "#e0e5ee",
    "--terminal-cursor": "#d7bcff",
    "--terminal-selection": "#46345f",
  },
  light: {
    "--window-titlebar-bg": "linear-gradient(180deg, rgba(248, 246, 251, 0.94), rgba(241, 238, 247, 0.9))",
    "--window-menu-bg": "linear-gradient(180deg, rgba(251, 249, 253, 0.98), rgba(241, 237, 248, 0.94))",
    "--window-hover-bg": "rgba(38, 26, 64, 0.08)",
    "--window-border": "rgba(126, 109, 174, 0.14)",
    "--shell-bg":
      "linear-gradient(90deg, rgba(200, 194, 221, 0.08) 0%, rgba(236, 233, 243, 0.92) 22%, rgba(248, 247, 250, 0.98) 44%, rgba(252, 251, 253, 1) 100%)",
    "--sidebar-bg":
      "linear-gradient(180deg, rgba(74, 70, 89, 0.98), rgba(90, 87, 106, 0.98) 54%, rgba(110, 107, 125, 0.98) 100%)",
    "--sidebar-border": "rgba(162, 147, 205, 0.16)",
    "--panel-bg": "linear-gradient(180deg, rgba(255, 255, 255, 0.985), rgba(248, 246, 251, 0.98))",
    "--panel-soft-bg": "rgba(255, 255, 255, 0.95)",
    "--panel-strong-bg": "rgba(251, 249, 253, 0.98)",
    "--panel-border": "rgba(149, 133, 190, 0.14)",
    "--text-primary": "#1f2430",
    "--text-secondary": "#444c5a",
    "--text-tertiary": "#555d6d",
    "--text-contrast": "#11151b",
    "--button-bg": "rgba(255, 255, 255, 0.82)",
    "--button-border": "rgba(149, 133, 190, 0.16)",
    "--button-primary-bg": "linear-gradient(135deg, rgba(170, 155, 214, 0.96), rgba(128, 112, 171, 0.96))",
    "--button-primary-border": "rgba(162, 146, 204, 0.24)",
    "--active-bg": "rgba(74, 55, 119, 0.09)",
    "--badge-bg": "rgba(93, 84, 126, 0.74)",
    "--input-bg": "rgba(255, 255, 255, 0.92)",
    "--input-border": "rgba(155, 140, 194, 0.24)",
    "--input-focus": "rgba(173, 159, 211, 0.34)",
    "--terminal-frame-bg":
      "linear-gradient(180deg, rgba(10, 11, 13, 0.98), rgba(5, 6, 8, 1)), radial-gradient(circle at top right, rgba(145, 95, 255, 0.08), transparent 28%)",
    "--terminal-bg": "#090b0d",
    "--terminal-fg": "#e0e5ee",
    "--terminal-cursor": "#d7bcff",
    "--terminal-selection": "#46345f",
  },
};
type InstallConsoleState = {
  action: InstallActionRequest["action"] | null;
  log: string;
  status: "idle" | "running" | "success" | "error";
  toolId: string | null;
};

function App() {
  const [activePage, setActivePage] = useState<PageId>("new-session");
  const [tools, setTools] = useState<ToolState[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [diagnostics, setDiagnostics] = useState<BootstrapSnapshot["diagnostics"] | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [editorToolId, setEditorToolId] = useState("codex");
  const [activity, setActivity] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [sessionBuffers, setSessionBuffers] = useState<Record<string, string>>({});
  const [configProviderUrl, setConfigProviderUrl] = useState("");
  const [configApiKey, setConfigApiKey] = useState("");
  const [configModel, setConfigModel] = useState("");
  const [configRuntimeProfile, setConfigRuntimeProfile] = useState<RuntimeProfile>("powershell");
  const [configNodeProvider, setConfigNodeProvider] = useState<NodeProvider>("managed");
  const [clearStoredKey, setClearStoredKey] = useState(false);
  const [pendingWorkspacePath, setPendingWorkspacePath] = useState("");
  const [isCliPickerOpen, setIsCliPickerOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [languageChoice, setLanguageChoice] = useState<LanguageChoice>(() =>
    readStoredString("clihub.languageChoice", "system") as LanguageChoice,
  );
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readStoredString("clihub.themeMode", "dark") as ThemeMode);
  const [uiFontPreset, setUiFontPreset] = useState(() => readStoredString("clihub.uiFontPreset", "system"));
  const [uiFontSize, setUiFontSize] = useState(() => readStoredNumber("clihub.uiFontSize", 15));
  const [terminalFontPreset, setTerminalFontPreset] = useState(() =>
    readStoredString("clihub.terminalFontPreset", "plex-mono"),
  );
  const [terminalFontSize, setTerminalFontSize] = useState(() =>
    readStoredNumber("clihub.terminalFontSize", 14),
  );
  const [installConsole, setInstallConsole] = useState<InstallConsoleState>({
    action: null,
    log: "",
    status: "idle",
    toolId: null,
  });

  const terminalHostRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const terminalOutputReadySessionIdRef = useRef<string | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const lastTerminalSizeRef = useRef<{ cols: number; rows: number } | null>(null);

  const toolMap = useMemo(
    () =>
      tools.reduce<Record<string, ToolState>>((memo, tool) => {
        memo[tool.descriptor.id] = tool;
        return memo;
      }, {}),
    [tools],
  );

  const selectedSession = useMemo(
    () => sessions.find((session) => session.sessionId === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  );
  const showTerminal = activePage === "new-session";
  const terminalWindowsPty = useMemo(
    () =>
      navigator.userAgent.includes("Windows") && diagnostics?.windowsBuildNumber
        ? { backend: "conpty" as const, buildNumber: diagnostics.windowsBuildNumber }
        : undefined,
    [diagnostics?.windowsBuildNumber],
  );
  const showFloatingInstallConsole =
    activePage !== "install" &&
    installConsole.toolId !== null &&
    (installConsole.status === "running" || installConsole.status === "error");
  const uiLocale = useMemo(() => resolveLocale(languageChoice), [languageChoice]);
  const copy = useMemo(() => getUiCopy(uiLocale), [uiLocale]);

  const editorTool = toolMap[editorToolId] ?? tools[0] ?? null;
  const uiFontFamily =
    UI_FONT_PRESETS.find((preset) => preset.id === uiFontPreset)?.family ?? UI_FONT_PRESETS[0].family;
  const terminalFontFamily =
    TERMINAL_FONT_PRESETS.find((preset) => preset.id === terminalFontPreset)?.family ??
    TERMINAL_FONT_PRESETS[0].family;
  const appShellStyle = useMemo(
    () =>
      ({
        "--app-font-family": uiFontFamily,
        "--app-font-size": `${uiFontSize}px`,
        ...THEME_TOKENS[themeMode],
      }) as CSSProperties,
    [themeMode, uiFontFamily, uiFontSize],
  );
  const terminalTheme = useMemo(
    () => ({
      background: THEME_TOKENS[themeMode]["--terminal-bg"],
      foreground: THEME_TOKENS[themeMode]["--terminal-fg"],
      cursor: THEME_TOKENS[themeMode]["--terminal-cursor"],
      selectionBackground: THEME_TOKENS[themeMode]["--terminal-selection"],
      black: THEME_TOKENS[themeMode]["--terminal-bg"],
      blue: themeMode === "dark" ? "#8eb4ff" : "#5b73d4",
      brightBlue: themeMode === "dark" ? "#b8cbff" : "#6f87e7",
      brightGreen: "#b4f2b0",
      brightMagenta: "#efc2ff",
      brightRed: "#ffb39f",
      brightYellow: "#ffe4a1",
      cyan: "#94dfd9",
      green: "#8ed88a",
      magenta: "#d7a8ff",
      red: "#ff8d88",
      white: THEME_TOKENS[themeMode]["--terminal-fg"],
      yellow: "#f6da88",
    }),
    [themeMode],
  );
  const getErrorMessage = (error: unknown) => asMessage(error, copy.common.genericError);

  const groupedSessions = useMemo(() => {
    const groups = new Map<string, SessionRecord[]>();
    const sorted = [...sessions].sort(
      (left, right) =>
        new Date(right.lastOpenedAt).getTime() - new Date(left.lastOpenedAt).getTime(),
    );
    for (const session of sorted) {
      const existing = groups.get(session.workspacePath) ?? [];
      existing.push(session);
      groups.set(session.workspacePath, existing);
    }
    return [...groups.entries()];
  }, [sessions]);

  useEffect(() => {
    void refreshSnapshot();
  }, []);

  useEffect(() => {
    if (!showTerminal || !terminalHostRef.current || terminalRef.current) {
      return;
    }
    const terminal = new Terminal({
      allowTransparency: false,
      customGlyphs: false,
      cursorBlink: true,
      fontFamily: terminalFontFamily,
      fontSize: terminalFontSize,
      letterSpacing: 0,
      lineHeight: 1,
      scrollback: 10_000,
      scrollSensitivity: 1,
      smoothScrollDuration: 0,
      ...(terminalWindowsPty ? { windowsPty: terminalWindowsPty } : {}),
      theme: terminalTheme,
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalHostRef.current);
    window.requestAnimationFrame(() => {
      fitTerminalAndResizeActiveSession();
      terminal.focus();
    });

    const dataDisposable = terminal.onData((data) => {
      const sessionId = activeSessionIdRef.current;
      if (sessionId) {
        void writeSessionInput(sessionId, data);
      }
    });

    const handleWindowResize = () => {
      scheduleTerminalFit();
    };
    window.addEventListener("resize", handleWindowResize);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    return () => {
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
      window.removeEventListener("resize", handleWindowResize);
      dataDisposable.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      terminalOutputReadySessionIdRef.current = null;
    };
  }, [showTerminal, terminalTheme, terminalWindowsPty]);

  useEffect(() => {
    if (!showTerminal || !terminalHostRef.current || typeof ResizeObserver === "undefined") {
      return;
    }

    const host = terminalHostRef.current;
    const frame = host.parentElement;
    const observer = new ResizeObserver(() => {
      scheduleTerminalFit();
    });

    observer.observe(host);
    if (frame) {
      observer.observe(frame);
    }

    return () => {
      observer.disconnect();
    };
  }, [showTerminal]);

  useEffect(() => {
    if (!terminalRef.current || !terminalWindowsPty) {
      return;
    }
    terminalRef.current.options.windowsPty = terminalWindowsPty;
  }, [terminalWindowsPty]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = uiLocale;
    }
  }, [uiLocale]);

  useEffect(() => {
    if (!showTerminal) {
      return;
    }
    activeSessionIdRef.current = selectedSessionId;
    const terminal = terminalRef.current;
    if (!terminal) {
      return;
    }
    terminalOutputReadySessionIdRef.current = null;
    terminal.reset();
    if (!selectedSessionId) {
      return;
    }
    if (selectedSession?.status !== "running") {
      if (selectedSession?.status === "starting") {
        terminal.writeln(copy.terminal.startingCli);
      }
      return;
    }
    const buffer = sessionBuffers[selectedSessionId];
    if (buffer) {
      terminal.write(buffer);
      terminalOutputReadySessionIdRef.current = selectedSessionId;
    } else {
      terminal.writeln(copy.terminal.connectingTerminal);
    }
    window.requestAnimationFrame(() => {
      fitTerminalAndResizeActiveSession();
      terminal.focus();
    });
  }, [copy.terminal.connectingTerminal, copy.terminal.startingCli, selectedSessionId, showTerminal]);

  useEffect(() => {
    if (!showTerminal || selectedSession?.status !== "starting" || !terminalRef.current) {
      return;
    }
    terminalOutputReadySessionIdRef.current = null;
    terminalRef.current.reset();
    terminalRef.current.writeln(copy.terminal.startingCli);
  }, [copy.terminal.startingCli, selectedSession?.status, selectedSessionId, showTerminal]);

  useEffect(() => {
    if (showTerminal) {
      scheduleTerminalFit();
    }
  }, [activePage, isCliPickerOpen, showTerminal]);

  useEffect(() => {
    writeStoredString("clihub.languageChoice", languageChoice);
  }, [languageChoice]);

  useEffect(() => {
    writeStoredString("clihub.themeMode", themeMode);
  }, [themeMode]);

  useEffect(() => {
    writeStoredString("clihub.uiFontPreset", uiFontPreset);
  }, [uiFontPreset]);

  useEffect(() => {
    writeStoredNumber("clihub.uiFontSize", uiFontSize);
  }, [uiFontSize]);

  useEffect(() => {
    writeStoredString("clihub.terminalFontPreset", terminalFontPreset);
  }, [terminalFontPreset]);

  useEffect(() => {
    writeStoredNumber("clihub.terminalFontSize", terminalFontSize);
  }, [terminalFontSize]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) {
      return;
    }
    terminal.options.fontFamily = terminalFontFamily;
    terminal.options.fontSize = terminalFontSize;
    terminal.options.theme = terminalTheme;
    scheduleTerminalFit();
  }, [terminalFontFamily, terminalFontSize, terminalTheme]);

  useEffect(() => {
    let active = true;
    let disposeOutput: (() => void) | undefined;
    let disposeExit: (() => void) | undefined;
    let disposeInstall: (() => void) | undefined;

    void listen<SessionOutputEvent>("session://output", (event) => {
      const payload = event.payload;
      startTransition(() => {
        setSessionBuffers((previous) => {
          const next = { ...previous };
          const existing = next[payload.sessionId] ?? "";
          next[payload.sessionId] = `${existing}${payload.data}`.slice(-MAX_BUFFER);
          return next;
        });
      });
      if (payload.sessionId === activeSessionIdRef.current) {
        const terminal = terminalRef.current;
        if (terminal) {
          if (terminalOutputReadySessionIdRef.current !== payload.sessionId) {
            terminal.reset();
            terminalOutputReadySessionIdRef.current = payload.sessionId;
          }
          terminal.write(payload.data);
        }
      }
      setSessions((previous) =>
        previous.map((session) =>
          session.sessionId === payload.sessionId ? { ...session, status: "running" } : session,
        ),
      );
    }).then((dispose) => {
      if (active) {
        disposeOutput = dispose;
      }
    });

    void listen<SessionExitEvent>("session://exit", (event) => {
      const payload = event.payload;
      setSessions((previous) =>
        previous.map((session) =>
          session.sessionId === payload.sessionId
            ? { ...session, status: "exited", lastExitCode: payload.exitCode }
            : session,
        ),
      );
    }).then((dispose) => {
      if (active) {
        disposeExit = dispose;
      }
    });

    void listen<InstallProgressEvent>("install://progress", (event) => {
      const payload = event.payload;
      setInstallConsole((previous) => {
        const next =
          previous.toolId === payload.toolId && previous.action === payload.action
            ? previous
            : {
                action: payload.action as InstallActionRequest["action"],
                log: "",
                status: "running" as const,
                toolId: payload.toolId,
              };
        return {
          ...next,
          log: `${next.log}${payload.message}`,
          status: "running",
        };
      });
      const message = payload.message.trim();
      if (message) {
        setActivity(message);
      }
    }).then((dispose) => {
      if (active) {
        disposeInstall = dispose;
      }
    });

    return () => {
      active = false;
      disposeOutput?.();
      disposeExit?.();
      disposeInstall?.();
    };
  }, []);

  useEffect(() => {
    if (!editorTool) {
      return;
    }
    setConfigProviderUrl(editorTool.config.providerUrl ?? "");
    setConfigApiKey("");
    setConfigModel(editorTool.config.model ?? "");
    setConfigRuntimeProfile(
      editorTool.config.runtimeProfile ??
        editorTool.descriptor.recommendedProfiles[0] ??
        "powershell",
    );
    setConfigNodeProvider(editorTool.config.nodeProvider ?? "managed");
    setClearStoredKey(false);
  }, [editorTool]);

  async function refreshSnapshot(nextSelectedSessionId?: string | null) {
    setBusyAction("refresh");
    try {
      const snapshot = await bootstrapApp(windowLabel);
      applySnapshot(snapshot, nextSelectedSessionId);
      setActivity("");
    } catch (error) {
      setActivity(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  function applySnapshot(snapshot: BootstrapSnapshot, nextSelectedSessionId?: string | null) {
    setTools(snapshot.tools);
    setSessions(snapshot.sessions);
    setDiagnostics(snapshot.diagnostics);
    const chosenSessionId =
      nextSelectedSessionId ??
      snapshot.windowState.activeSessionId ??
      snapshot.sessions[0]?.sessionId ??
      null;
    const chosenToolId =
      snapshot.sessions.find((session) => session.sessionId === chosenSessionId)?.toolId ??
      snapshot.tools[0]?.descriptor.id ??
      "codex";
    setSelectedSessionId(chosenSessionId);
    setEditorToolId(chosenToolId);
  }

  async function startNewSessionFlow() {
    const picked = await open({ directory: true, multiple: false });
    if (typeof picked !== "string") {
      return;
    }
    setPendingWorkspacePath(picked);
    setIsCliPickerOpen(true);
    setActivePage("new-session");
  }

  async function handlePickCli(toolId: string) {
    const workspacePath = pendingWorkspacePath.trim();
    if (!workspacePath) {
      return;
    }
    const tool = toolMap[toolId];
    if (!tool) {
      return;
    }

    setBusyAction(`pick:${toolId}`);
    setActivity(copy.activity.creatingSession(shortWorkspaceName(workspacePath), tool.descriptor.displayName));
    const pendingSession = createPendingSession(workspacePath, toolId, latestSessionConfig(tool), tool.descriptor.displayName);
    setSessions((previous) => [pendingSession, ...previous.filter((entry) => entry.sessionId !== pendingSession.sessionId)]);
    setSelectedSessionId(pendingSession.sessionId);
    setEditorToolId(toolId);
    setActivePage("new-session");

    try {
      if (!tool.installStatus.installed) {
        setActivity(copy.activity.autoInstallingTool(tool.descriptor.displayName));
        setInstallConsole({
          action: "install",
          log: `${copy.install.actionLabel.install} ${tool.descriptor.displayName}...\n`,
          status: "running",
          toolId,
        });
        const installResult = await runInstallAction({ toolId, action: "install" });
        if (!installResult.success) {
          setInstallConsole((previous) =>
            previous.toolId === toolId
              ? {
                  ...previous,
                  log: appendInstallLog(previous.log, installResult.log),
                  status: "error",
                }
              : previous,
          );
          throw new Error(installResult.log || `${tool.descriptor.displayName} ${copy.install.statusError}.`);
        }
        setInstallConsole((previous) =>
          previous.toolId === toolId
            ? {
                ...previous,
                log: appendInstallLog(previous.log, installResult.log),
                status: "success",
              }
            : previous,
        );
        await refreshSnapshot();
        setSessions((previous) => [
          pendingSession,
          ...previous.filter((entry) => entry.sessionId !== pendingSession.sessionId),
        ]);
        setSelectedSessionId(pendingSession.sessionId);
        setEditorToolId(toolId);
        setActivePage("new-session");
      }

      const latestTool = toolMap[toolId] ?? tool;
      const session = await launchSession({
        workspacePath,
        toolId,
        windowId: windowLabel,
        model: latestTool.config.model,
        runtimeProfile: latestTool.config.runtimeProfile,
        nodeProvider: latestTool.config.nodeProvider,
      });
      const nextSession = withStartingStatus(session);
      setSessions((previous) => [
        nextSession,
        ...previous.filter(
          (entry) => entry.sessionId !== nextSession.sessionId && entry.sessionId !== pendingSession.sessionId,
        ),
      ]);
      setSelectedSessionId(nextSession.sessionId);
      setEditorToolId(toolId);
      setActivePage("new-session");
      await setActiveSession(windowLabel, nextSession.sessionId);
      setIsCliPickerOpen(false);
      setPendingWorkspacePath(workspacePath);
      setActivity(copy.activity.sessionCreatedStarting(tool.descriptor.displayName));
    } catch (error) {
      setSessions((previous) => previous.filter((entry) => entry.sessionId !== pendingSession.sessionId));
      setSelectedSessionId((current) => (current === pendingSession.sessionId ? null : current));
      setActivity(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSelectSession(session: SessionRecord) {
    setActivePage("new-session");
    setSelectedSessionId(session.sessionId);
    setEditorToolId(session.toolId);
    await setActiveSession(windowLabel, session.sessionId);
  }

  async function handleResumeSession(session: SessionRecord) {
    setBusyAction(`resume:${session.sessionId}`);
    setSessions((previous) =>
      previous.map((entry) =>
        entry.sessionId === session.sessionId ? { ...entry, status: "starting" } : entry,
      ),
    );
    try {
      const relaunched = await relaunchExistingSession(session.sessionId, windowLabel);
      const nextSession = withStartingStatus(relaunched);
      setSessions((previous) =>
        previous.map((entry) => (entry.sessionId === nextSession.sessionId ? nextSession : entry)),
      );
      setSelectedSessionId(nextSession.sessionId);
      setEditorToolId(nextSession.toolId);
      setActivePage("new-session");
      setActivity(copy.activity.sessionStarted(nextSession.title));
    } catch (error) {
      setSessions((previous) =>
        previous.map((entry) =>
          entry.sessionId === session.sessionId ? { ...entry, status: session.status } : entry,
        ),
      );
      setActivity(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleStopSession(sessionId: string) {
    setBusyAction(`stop:${sessionId}`);
    try {
      await stopSession(sessionId);
      setSessions((previous) =>
        previous.map((session) =>
          session.sessionId === sessionId ? { ...session, status: "stopped" } : session,
        ),
      );
      setActivity(copy.activity.sessionStopped);
    } catch (error) {
      setActivity(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleInstallAction(toolId: string, action: "install" | "update" | "repair" | "uninstall") {
    const tool = toolMap[toolId];
    if (!tool) {
      return;
    }
    setBusyAction(`${action}:${toolId}`);
    setActivity(copy.activity.installingTool(actionLabel(action, copy), tool.descriptor.displayName));
    setInstallConsole({
      action,
      log: `${actionLabel(action, copy)} ${tool.descriptor.displayName}...\n`,
      status: "running",
      toolId,
    });
    try {
      const result = await runInstallAction({ toolId, action });
      await refreshSnapshot();
      setInstallConsole((previous) =>
        previous.toolId === toolId
          ? {
              ...previous,
              log: appendInstallLog(previous.log, result.log),
              status: result.success ? "success" : "error",
              }
            : previous,
        );
      setActivity(result.log.trim() || `${tool.descriptor.displayName} ${actionResultLabel(action, copy)}.`);
    } catch (error) {
      setInstallConsole((previous) =>
        previous.toolId === toolId
          ? {
              ...previous,
              log: appendInstallLog(previous.log, getErrorMessage(error)),
              status: "error",
            }
          : previous,
      );
      setActivity(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handlePrepareManagedNode() {
    setBusyAction("managed-node");
    setActivity(copy.settings.preparingManagedNode);
    try {
      const managed = await ensureManagedNode();
      await refreshSnapshot();
      setActivity(copy.settings.managedNodeReady(managed.version));
    } catch (error) {
      setActivity(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSaveConfig() {
    if (!editorTool) {
      return;
    }
    setBusyAction(`config:${editorTool.descriptor.id}`);
    try {
      const request: SaveToolConfigRequest = {
        toolId: editorTool.descriptor.id,
        providerUrl: configProviderUrl || null,
        model: configModel || null,
        runtimeProfile: configRuntimeProfile,
        nodeProvider: configNodeProvider,
      };
      if (clearStoredKey) {
        request.apiKey = "";
      } else if (configApiKey.trim()) {
        request.apiKey = configApiKey.trim();
      }
      const updated = await saveToolConfig(request);
      setTools((previous) =>
        previous.map((tool) => (tool.descriptor.id === updated.descriptor.id ? updated : tool)),
      );
      setConfigApiKey("");
      setClearStoredKey(false);
      setActivity(copy.activity.configSaved(updated.descriptor.displayName));
    } catch (error) {
      setActivity(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateWindow() {
    setBusyAction("window");
    try {
      await createWorkspaceWindow();
      setActivity(copy.activity.windowOpened);
    } catch (error) {
      setActivity(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  function handleClearTerminalBuffer() {
    if (selectedSessionId) {
      setSessionBuffers((previous) => ({ ...previous, [selectedSessionId]: "" }));
    }
    terminalOutputReadySessionIdRef.current = null;
    terminalRef.current?.clear();
  }

  function scheduleTerminalFit() {
    if (!showTerminal) {
      return;
    }
    if (resizeFrameRef.current !== null) {
      window.cancelAnimationFrame(resizeFrameRef.current);
    }
    resizeFrameRef.current = window.requestAnimationFrame(() => {
      resizeFrameRef.current = null;
      fitTerminalAndResizeActiveSession();
    });
  }

  function fitTerminalAndResizeActiveSession() {
    const terminal = terminalRef.current;
    const fitAddon = fitAddonRef.current;
    if (!terminal || !fitAddon) {
      return;
    }

    fitAddon.fit();
    const nextSize = { cols: terminal.cols, rows: terminal.rows };
    const previousSize = lastTerminalSizeRef.current;
    if (previousSize?.cols === nextSize.cols && previousSize?.rows === nextSize.rows) {
      return;
    }

    lastTerminalSizeRef.current = nextSize;
    const sessionId = activeSessionIdRef.current;
    if (sessionId) {
      void resizeSession(sessionId, nextSize.cols, nextSize.rows);
    }
  }

  return (
    <main className="app-frame" data-theme-mode={themeMode} style={appShellStyle}>
      <WindowTitlebar
        activePage={activePage}
        copy={copy}
        onCreateWindow={handleCreateWindow}
        onOpenHelp={() => setIsHelpOpen(true)}
        onSelectPage={setActivePage}
        onStartNewSession={startNewSessionFlow}
      />

      <section className="app-shell">
        <Sidebar
          busyAction={busyAction}
          copy={copy}
          groupedSessions={groupedSessions}
          locale={uiLocale}
          onResumeSession={handleResumeSession}
          onSelectSession={handleSelectSession}
          onStopSession={handleStopSession}
          selectedSessionId={selectedSessionId}
          sessionMap={toolMap}
        />

        <section className={`content-shell ${showTerminal ? "terminal-layout" : ""}`}>
          {showTerminal ? null : (
            <header className="content-header">
              <div>
                <h1>{pageTitle(activePage, copy)}</h1>
                <p className="content-subtitle">{pageSubtitle(activePage, copy)}</p>
              </div>
              <div className="content-header-actions">
                <button className="ghost-button" disabled={busyAction === "refresh"} onClick={() => void refreshSnapshot()} type="button">
                  {copy.common.refresh}
                </button>
              </div>
            </header>
          )}

          <section className={`content-body ${showTerminal ? "terminal-only" : "page-only"}`}>
            {showTerminal ? (
              <TerminalWorkbench
                activity={activity}
                copy={copy}
                hostRef={terminalHostRef}
                onClearBuffer={handleClearTerminalBuffer}
                selectedSession={selectedSession}
              />
            ) : (
              <div className="page-card page-card-full">{renderPageContent()}</div>
            )}
          </section>
        </section>

        {showFloatingInstallConsole ? (
          <div className="install-console-floating-shell">{renderInstallConsole("floating")}</div>
        ) : null}
      </section>

      {isCliPickerOpen ? (
        <CliPickerModal
          busyAction={busyAction}
          copy={copy}
          onClose={() => setIsCliPickerOpen(false)}
          onConfirm={handlePickCli}
          tools={tools}
          workspacePath={pendingWorkspacePath}
        />
      ) : null}

      {isHelpOpen ? <HelpModal copy={copy} onClose={() => setIsHelpOpen(false)} /> : null}
    </main>
  );

  function renderPageContent() {
    if (activePage === "install") {
      return (
        <section className="install-layout">
          {renderInstallConsole("page")}

          <section className="page-grid install-grid">
            {tools.map((tool) => (
              <article className="tool-card" key={tool.descriptor.id}>
                <div className="tool-card-header">
                  <div>
                    <strong>{tool.descriptor.displayName}</strong>
                    <p>{tool.descriptor.description}</p>
                  </div>
                  <span className={`install-pill ${tool.installStatus.installed ? "installed" : "missing"}`}>
                    {tool.installStatus.installed ? copy.install.installed : copy.install.notInstalled}
                  </span>
                </div>
                <div className="tool-card-meta">
                  {tool.installStatus.version ? <span>{tool.installStatus.version}</span> : null}
                  <span>{tool.installStatus.detail}</span>
                </div>
                <div className="tool-actions">
                  <button
                    className="ghost-button compact"
                    disabled={busyAction === `install:${tool.descriptor.id}` || busyAction === `update:${tool.descriptor.id}`}
                    onClick={() => void handleInstallAction(tool.descriptor.id, tool.installStatus.installed ? "update" : "install")}
                    type="button"
                  >
                    {tool.installStatus.installed ? copy.install.actionButton.update : copy.install.actionButton.install}
                  </button>
                  <button
                    className="ghost-button compact"
                    disabled={busyAction === `repair:${tool.descriptor.id}`}
                    onClick={() => void handleInstallAction(tool.descriptor.id, "repair")}
                    type="button"
                  >
                    {copy.install.actionButton.repair}
                  </button>
                  <button
                    className="ghost-button compact danger"
                    disabled={busyAction === `uninstall:${tool.descriptor.id}`}
                    onClick={() => void handleInstallAction(tool.descriptor.id, "uninstall")}
                    type="button"
                  >
                    {copy.install.actionButton.uninstall}
                  </button>
                </div>
              </article>
            ))}
          </section>
        </section>
      );
    }

    if (activePage === "config") {
      return (
        <section className="config-layout">
          <div className="page-toolbar">
            <label className="field toolbar-field">
              <span>{copy.config.currentTool}</span>
              <select value={editorToolId} onChange={(event) => setEditorToolId(event.currentTarget.value)}>
                {tools.map((tool) => (
                  <option key={tool.descriptor.id} value={tool.descriptor.id}>
                    {tool.descriptor.displayName}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {editorTool ? (
            <div className="config-form">
              <label className="field">
                <span>{copy.config.providerUrl}</span>
                <input
                  value={configProviderUrl}
                  onChange={(event) => setConfigProviderUrl(event.currentTarget.value)}
                  placeholder={copy.config.providerPlaceholder}
                />
              </label>
              <label className="field">
                <span>{copy.config.apiKey}</span>
                <input
                  type="password"
                  value={configApiKey}
                  onChange={(event) => setConfigApiKey(event.currentTarget.value)}
                  placeholder={editorTool.config.hasApiKey ? copy.config.keyPlaceholderSaved : copy.config.keyPlaceholderEmpty}
                />
              </label>
              <label className="checkbox-field">
                <input checked={clearStoredKey} onChange={(event) => setClearStoredKey(event.currentTarget.checked)} type="checkbox" />
                <span>{copy.config.clearStoredKey}</span>
              </label>
              <div className="config-effective-card">
                <p className="section-label">{copy.config.effectiveConfig}</p>
                <div className="config-effective-grid">
                  <div>
                    <dt>{copy.config.effectiveProviderUrl}</dt>
                    <dd>{editorTool.config.effectiveProviderUrl ?? copy.config.unsetValue}</dd>
                  </div>
                  <div>
                    <dt>{copy.config.providerSource}</dt>
                    <dd>{configSourceLabel(copy, editorTool.config.providerUrlSource)}</dd>
                  </div>
                  <div>
                    <dt>{copy.config.effectiveApiKey}</dt>
                    <dd>{editorTool.config.effectiveHasApiKey ? copy.config.keyAvailable : copy.config.keyMissing}</dd>
                  </div>
                  <div>
                    <dt>{copy.config.apiKeySource}</dt>
                    <dd>{apiKeySourceLabel(copy, editorTool.config.apiKeySource)}</dd>
                  </div>
                </div>
              </div>
              <div className="two-column">
                <label className="field">
                  <span>{copy.config.model}</span>
                  <input value={configModel} onChange={(event) => setConfigModel(event.currentTarget.value)} placeholder={copy.config.modelPlaceholder} />
                </label>
                <label className="field">
                  <span>{copy.config.runtime}</span>
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
              </div>
              <label className="field">
                <span>{copy.config.nodeProvider}</span>
                <select
                  value={configNodeProvider}
                  onChange={(event) => setConfigNodeProvider(event.currentTarget.value as NodeProvider)}
                >
                  <option value="managed">{copy.config.managedNode}</option>
                  <option value="system">{copy.config.systemNode}</option>
                </select>
              </label>
              <div className="config-note">
                {editorTool.installStatus.detail ? <p>{editorTool.installStatus.detail}</p> : null}
                <p>{copy.config.officialLogin(editorTool.descriptor.supportsOfficialLogin)}</p>
                <p>{copy.config.inheritHint}</p>
              </div>
              <button
                className="primary-button"
                disabled={busyAction === `config:${editorTool.descriptor.id}`}
                onClick={() => void handleSaveConfig()}
                type="button"
              >
                {busyAction === `config:${editorTool.descriptor.id}` ? copy.config.saving : copy.config.save}
              </button>
            </div>
          ) : (
            <p className="muted-copy">{copy.config.noTools}</p>
          )}
        </section>
      );
    }

    if (activePage === "settings") {
      return (
        <section className="settings-grid">
          <article className="settings-card">
            <p className="section-label">{copy.settings.appearance}</p>
            <div className="settings-form">
              <label className="field">
                <span>{copy.settings.language}</span>
                <select value={languageChoice} onChange={(event) => setLanguageChoice(event.currentTarget.value as LanguageChoice)}>
                  {(["system", "zh-CN", "zh-TW", "en"] as const).map((choice) => (
                    <option key={choice} value={choice}>
                      {copy.settings.languageChoices[choice]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{copy.settings.theme}</span>
                <select value={themeMode} onChange={(event) => setThemeMode(event.currentTarget.value as ThemeMode)}>
                  {(["dark", "light"] as const).map((mode) => (
                    <option key={mode} value={mode}>
                      {copy.settings.themeChoices[mode]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </article>
          <article className="settings-card">
            <p className="section-label">{copy.settings.fonts}</p>
            <div className="settings-form">
              <label className="field">
                <span>{copy.settings.uiFont}</span>
                <select value={uiFontPreset} onChange={(event) => setUiFontPreset(event.currentTarget.value)}>
                  {UI_FONT_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{copy.settings.uiFontSize} {uiFontSize}px</span>
                <input
                  max={18}
                  min={14}
                  onChange={(event) => setUiFontSize(Number(event.currentTarget.value))}
                  type="range"
                  value={uiFontSize}
                />
              </label>
              <label className="field">
                <span>{copy.settings.terminalFont}</span>
                <select value={terminalFontPreset} onChange={(event) => setTerminalFontPreset(event.currentTarget.value)}>
                  {TERMINAL_FONT_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{copy.settings.terminalFontSize} {terminalFontSize}px</span>
                <input
                  max={18}
                  min={12}
                  onChange={(event) => setTerminalFontSize(Number(event.currentTarget.value))}
                  type="range"
                  value={terminalFontSize}
                />
              </label>
            </div>
          </article>
          <article className="settings-card">
            <p className="section-label">{copy.settings.environment}</p>
            <dl className="diagnostic-grid">
              <div>
                <dt>{copy.settings.platform}</dt>
                <dd>{diagnostics?.platform ?? copy.settings.environmentChecking}</dd>
              </div>
              <div>
                <dt>{copy.settings.systemNode}</dt>
                <dd>{diagnostics?.systemNodeVersion ?? copy.settings.environmentMissing}</dd>
              </div>
              <div>
                <dt>{copy.settings.managedNode}</dt>
                <dd>{diagnostics?.managedNode.version ?? copy.settings.environmentNotReady}</dd>
              </div>
              <div>
                <dt>{copy.settings.docker}</dt>
                <dd>
                  {!diagnostics?.docker.installed
                    ? copy.settings.dockerUnavailable
                    : diagnostics.docker.running
                      ? diagnostics.docker.version ?? copy.sidebar.status.running
                      : copy.settings.dockerInstalledButUnavailable}
                </dd>
              </div>
            </dl>
          </article>
          <article className="settings-card">
            <p className="section-label">{copy.settings.actions}</p>
            <div className="settings-actions">
              <button className="ghost-button" disabled={busyAction === "managed-node"} onClick={() => void handlePrepareManagedNode()} type="button">
                {busyAction === "managed-node" ? copy.settings.preparingManagedNode : copy.settings.prepareManagedNode}
              </button>
              <button className="ghost-button" disabled={busyAction === "refresh"} onClick={() => void refreshSnapshot()} type="button">
                {copy.settings.recheckEnvironment}
              </button>
            </div>
          </article>
        </section>
      );
    }
    return null;
  }

  function renderInstallConsole(mode: "page" | "floating") {
    if (!installConsole.toolId) {
      return null;
    }

    return (
      <article className={`install-console install-console-${installConsole.status} install-console-${mode}`}>
        <div className="tool-card-header">
          <div>
            <strong>
              {(toolMap[installConsole.toolId]?.descriptor.displayName ?? installConsole.toolId)} ·{" "}
              {installActionTitle(installConsole.action, copy)}
            </strong>
            <p>{installStatusLabel(installConsole.status, copy)}</p>
          </div>
          <span className={`install-pill ${installConsole.status === "error" ? "missing" : "installed"}`}>
            {installStatusLabel(installConsole.status, copy)}
          </span>
        </div>
        <pre className="install-console-log">{installConsole.log.trim() || copy.common.waitingOutput}</pre>
      </article>
    );
  }
}

function pageTitle(page: PageId, copy: ReturnType<typeof getUiCopy>) {
  return copy.page.title[page];
}

function pageSubtitle(page: PageId, copy: ReturnType<typeof getUiCopy>) {
  return copy.page.subtitle[page];
}

function actionLabel(action: string, copy: ReturnType<typeof getUiCopy>) {
  return copy.install.actionLabel[action as keyof typeof copy.install.actionLabel] ?? copy.install.actionLabel.default;
}

function actionResultLabel(action: string, copy: ReturnType<typeof getUiCopy>) {
  return copy.install.actionResult[action as keyof typeof copy.install.actionResult] ?? copy.install.actionResult.default;
}

function shortWorkspaceName(workspacePath: string) {
  const normalized = workspacePath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? workspacePath;
}

function latestSessionConfig(tool: ToolState) {
  return {
    runtimeProfile:
      tool.config.runtimeProfile ?? tool.descriptor.recommendedProfiles[0] ?? "powershell",
    nodeProvider: tool.config.nodeProvider ?? "managed",
    model: tool.config.model ?? null,
  } as const;
}

function createPendingSession(
  workspacePath: string,
  toolId: string,
  config: { runtimeProfile: RuntimeProfile; nodeProvider: NodeProvider; model: string | null },
  displayName: string,
): SessionRecord {
  const now = new Date().toISOString();
  return {
    sessionId: `pending:${Date.now()}:${toolId}`,
    workspacePath,
    toolId,
    runtimeProfile: config.runtimeProfile,
    nodeProvider: config.nodeProvider,
    model: config.model,
    windowId: windowLabel,
    createdAt: now,
    lastOpenedAt: now,
    lastExitCode: null,
    status: "starting",
    title: `${shortWorkspaceName(workspacePath)} · ${displayName}`,
    commandPreview: "",
  };
}

function withStartingStatus(session: SessionRecord): SessionRecord {
  return { ...session, status: "starting" };
}

function appendInstallLog(existing: string, next: string) {
  if (!next.trim()) {
    return existing;
  }
  return existing.endsWith("\n") || !existing ? `${existing}${next}` : `${existing}\n${next}`;
}

function installActionTitle(action: InstallActionRequest["action"] | null, copy: ReturnType<typeof getUiCopy>) {
  if (!action) {
    return copy.install.titleForAction.default;
  }
  return copy.install.titleForAction[action];
}

function installStatusLabel(status: InstallConsoleState["status"], copy: ReturnType<typeof getUiCopy>) {
  return localizedInstallStatusLabel(copy, status);
}

function asMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return fallback;
}

function readStoredString(key: string, fallback: string) {
  if (typeof window === "undefined") {
    return fallback;
  }
  return window.localStorage.getItem(key) ?? fallback;
}

function readStoredNumber(key: string, fallback: number) {
  if (typeof window === "undefined") {
    return fallback;
  }
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function writeStoredString(key: string, value: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, value);
  }
}

function writeStoredNumber(key: string, value: number) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, String(value));
  }
}

export default App;
