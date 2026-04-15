import type { ToolState } from "../types";
import type { UiCopy } from "../ui";

interface CliPickerModalProps {
  busyAction: string | null;
  copy: UiCopy;
  onClose: () => void;
  onConfirm: (toolId: string) => Promise<void>;
  tools: ToolState[];
  workspacePath: string;
}

export function CliPickerModal({
  busyAction,
  copy,
  onClose,
  onConfirm,
  tools,
  workspacePath,
}: CliPickerModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="cli-picker-title">
        <div className="modal-header">
          <div>
            <p className="section-label">{copy.picker.eyebrow}</p>
            <h2 id="cli-picker-title">{copy.picker.title}</h2>
            <p className="muted-copy">{workspacePath}</p>
          </div>
          <button className="ghost-button compact modal-close-button" onClick={onClose} type="button">
            {copy.common.close}
          </button>
        </div>

        <div className="picker-list">
          {tools.map((tool) => (
            <button
              className="picker-item"
              disabled={busyAction === `pick:${tool.descriptor.id}`}
              key={tool.descriptor.id}
              onClick={() => void onConfirm(tool.descriptor.id)}
              type="button"
            >
              <div>
                <strong>{tool.descriptor.displayName}</strong>
                <p>{tool.descriptor.description}</p>
              </div>
              <div className="picker-meta">
                <span className={`install-pill ${tool.installStatus.installed ? "installed" : "missing"}`}>
                  {tool.installStatus.installed ? copy.picker.installed : copy.picker.notInstalled}
                </span>
                <span className="picker-action">
                  {busyAction === `pick:${tool.descriptor.id}`
                    ? copy.common.processing
                    : tool.installStatus.installed
                      ? copy.picker.createSession
                      : copy.picker.autoInstallAndCreate}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
