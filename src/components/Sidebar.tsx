import { CaretDown, CaretRight } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { SessionRecord, ToolState } from "../types";
import { formatTimestamp, type UiCopy, type UiLocale } from "../ui";

export type PageId = "new-session" | "install" | "config" | "settings";

interface SidebarProps {
  busyAction: string | null;
  copy: UiCopy;
  groupedSessions: Array<[string, SessionRecord[]]>;
  locale: UiLocale;
  onResumeSession: (session: SessionRecord) => Promise<void>;
  onSelectSession: (session: SessionRecord) => Promise<void>;
  onStopSession: (sessionId: string) => Promise<void>;
  selectedSessionId: string | null;
  sessionMap: Record<string, ToolState>;
}

export function Sidebar({
  busyAction,
  copy,
  groupedSessions,
  locale,
  onResumeSession,
  onSelectSession,
  onStopSession,
  selectedSessionId,
  sessionMap,
}: SidebarProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCollapsedGroups((previous) => {
      const next: Record<string, boolean> = {};
      let changed = false;

      for (const [workspacePath] of groupedSessions) {
        if (workspacePath in previous) {
          next[workspacePath] = previous[workspacePath];
        } else {
          next[workspacePath] = false;
          changed = true;
        }
      }

      if (Object.keys(previous).length !== Object.keys(next).length) {
        changed = true;
      }

      return changed ? next : previous;
    });
  }, [groupedSessions]);

  return (
    <aside className="sidebar">
      <section className="sidebar-sessions">
        <div className="sidebar-section-header">
          <h2>{copy.sidebar.sessions}</h2>
        </div>

        <div className="session-groups">
          {groupedSessions.length === 0 ? (
            <p className="muted-copy">{copy.sidebar.noSessions}</p>
          ) : (
            groupedSessions.map(([workspacePath, group]) => (
              <section className="session-group" key={workspacePath}>
                <button
                  aria-expanded={!collapsedGroups[workspacePath]}
                  className="session-group-toggle"
                  onClick={() =>
                    setCollapsedGroups((previous) => ({
                      ...previous,
                      [workspacePath]: !previous[workspacePath],
                    }))
                  }
                  type="button"
                >
                  <div className="session-group-meta">
                    <span className="session-group-chevron" aria-hidden="true">
                      {collapsedGroups[workspacePath] ? (
                        <CaretRight size={13} weight="bold" />
                      ) : (
                        <CaretDown size={13} weight="bold" />
                      )}
                    </span>
                    <h3 title={workspacePath}>{shortWorkspaceName(workspacePath)}</h3>
                  </div>
                  <span className="group-count">{group.length}</span>
                </button>

                {collapsedGroups[workspacePath] ? null : (
                  <div className="session-group-list">
                    {group.map((session) => (
                      <div
                        className={`session-item ${session.sessionId === selectedSessionId ? "active" : ""}`}
                        key={session.sessionId}
                      >
                        <button className="session-main" onClick={() => void onSelectSession(session)} type="button">
                          <div className="session-line">
                            <strong className="session-tool-name">
                              {sessionMap[session.toolId]?.descriptor.displayName ?? session.toolId}
                            </strong>
                            <span className={`status-pill ${session.status}`}>{copy.sidebar.status[session.status]}</span>
                          </div>
                          <span className="session-timestamp">{formatTimestamp(session.lastOpenedAt, locale)}</span>
                        </button>
                        <div className="session-actions">
                          {session.status === "starting" ? (
                            <button className="ghost-button compact" disabled type="button">
                              {copy.sidebar.actionStarting}
                            </button>
                          ) : session.status !== "running" ? (
                            <button
                              className="ghost-button compact"
                              disabled={busyAction === `resume:${session.sessionId}`}
                              onClick={() => void onResumeSession(session)}
                              type="button"
                            >
                              {copy.sidebar.actionStart}
                            </button>
                          ) : (
                            <button
                              className="ghost-button compact"
                              disabled={busyAction === `stop:${session.sessionId}`}
                              onClick={() => void onStopSession(session.sessionId)}
                              type="button"
                            >
                              {copy.sidebar.actionStop}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))
          )}
        </div>
      </section>
    </aside>
  );
}

function shortWorkspaceName(workspacePath: string) {
  const normalized = workspacePath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? workspacePath;
}
