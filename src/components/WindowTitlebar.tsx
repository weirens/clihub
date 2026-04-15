import { CaretRight, Minus, Square, X } from "@phosphor-icons/react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect, useRef, useState } from "react";
import type { UiCopy } from "../ui";
import { AppIcon } from "./AppIcon";
import type { PageId } from "./Sidebar";

interface WindowTitlebarProps {
  activePage: PageId;
  copy: UiCopy;
  onCreateWindow: () => Promise<void>;
  onOpenHelp: () => void;
  onSelectPage: (page: PageId) => void;
  onStartNewSession: () => Promise<void>;
}

const appWindow = getCurrentWebviewWindow();

export function WindowTitlebar({
  activePage,
  copy,
  onCreateWindow,
  onOpenHelp,
  onSelectPage,
  onStartNewSession,
}: WindowTitlebarProps) {
  const [openMenu, setOpenMenu] = useState<"file" | "window" | null>(null);
  const menuRootRef = useRef<HTMLDivElement | null>(null);
  const fileItems: Array<{ id: PageId; label: string }> = [
    { id: "new-session", label: copy.titlebar.pages["new-session"] },
    { id: "install", label: copy.titlebar.pages.install },
    { id: "config", label: copy.titlebar.pages.config },
    { id: "settings", label: copy.titlebar.pages.settings },
  ];

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRootRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [openMenu]);

  return (
    <header className="window-titlebar">
      <div className="window-titlebar-main">
        <div className="window-titlebar-leading" ref={menuRootRef}>
          <AppIcon className="window-brand-icon" />

          <div className="window-menu-anchor">
            <button
              className="titlebar-text-button"
              onClick={() => setOpenMenu((current) => (current === "file" ? null : "file"))}
              type="button"
            >
              {copy.titlebar.file}
            </button>
            {openMenu === "file" ? (
              <div className="window-menu-panel">
                {fileItems.map((item) => (
                  <button
                    className={`window-menu-item ${activePage === item.id ? "active" : ""}`}
                    key={item.id}
                    onClick={() => {
                      setOpenMenu(null);
                      if (item.id === "new-session") {
                        void onStartNewSession();
                        return;
                      }
                      onSelectPage(item.id);
                    }}
                    type="button"
                  >
                    <span>{item.label}</span>
                    <span className="window-menu-caret" aria-hidden="true">
                      <CaretRight size={10} weight="bold" />
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="window-menu-anchor">
            <button
              className="titlebar-text-button"
              onClick={() => setOpenMenu((current) => (current === "window" ? null : "window"))}
              type="button"
            >
              {copy.titlebar.window}
            </button>
            {openMenu === "window" ? (
              <div className="window-menu-panel">
                <button
                  className="window-menu-item"
                  onClick={() => {
                    setOpenMenu(null);
                    void onCreateWindow();
                  }}
                  type="button"
                >
                  <span>{copy.titlebar.newWindow}</span>
                  <span className="window-menu-caret" aria-hidden="true">
                    <CaretRight size={10} weight="bold" />
                  </span>
                </button>
              </div>
            ) : null}
          </div>

          <button className="titlebar-text-button" onClick={onOpenHelp} type="button">
            {copy.titlebar.help}
          </button>
        </div>
        <div className="window-titlebar-spacer" data-tauri-drag-region />
      </div>

      <div className="window-controls">
        <button
          aria-label={copy.titlebar.minimize}
          className="window-control-button"
          onClick={() => void appWindow.minimize()}
          type="button"
        >
          <span className="control-icon" aria-hidden="true">
            <Minus size={16} weight="regular" />
          </span>
        </button>
        <button
          aria-label={copy.titlebar.maximize}
          className="window-control-button"
          onClick={() => void appWindow.toggleMaximize()}
          type="button"
        >
          <span className="control-icon" aria-hidden="true">
            <Square size={14} weight="regular" />
          </span>
        </button>
        <button
          aria-label={copy.titlebar.closeWindow}
          className="window-control-button close"
          onClick={() => void appWindow.close()}
          type="button"
        >
          <span className="control-icon" aria-hidden="true">
            <X size={16} weight="regular" />
          </span>
        </button>
      </div>
    </header>
  );
}
