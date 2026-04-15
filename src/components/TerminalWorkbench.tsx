import { Broom } from "@phosphor-icons/react";
import type { RefObject } from "react";
import type { SessionRecord } from "../types";
import type { UiCopy } from "../ui";

interface TerminalWorkbenchProps {
  activity: string;
  copy: UiCopy;
  hostRef: RefObject<HTMLDivElement | null>;
  onClearBuffer: () => void;
  selectedSession: SessionRecord | null;
}

export function TerminalWorkbench({
  activity,
  copy,
  hostRef,
  onClearBuffer,
  selectedSession,
}: TerminalWorkbenchProps) {
  return (
    <article className="terminal-panel">
      <div className="terminal-toolbar">
        <div className="terminal-toolbar-copy">
          {selectedSession ? (
            <>
              <h2>{selectedSession.title}</h2>
              <p className="muted-copy">
                {selectedSession.workspacePath}
                {selectedSession.commandPreview ? ` · ${copy.terminal.launchCommand}: ${selectedSession.commandPreview}` : ""}
              </p>
            </>
          ) : null}
        </div>
        <div className="terminal-actions">
          <button className="ghost-button" onClick={onClearBuffer} type="button">
            <span className="button-icon" aria-hidden="true">
              <Broom size={18} weight="regular" />
            </span>
            {copy.terminal.clearOutput}
          </button>
        </div>
      </div>

      <div className="terminal-frame">
        <div ref={hostRef} className="terminal-host" />
      </div>

      {activity ? <div className="activity-strip">{activity}</div> : null}
    </article>
  );
}
