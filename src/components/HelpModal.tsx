import type { UiCopy } from "../ui";
import { AppIcon } from "./AppIcon";

interface HelpModalProps {
  copy: UiCopy;
  onClose: () => void;
}

export function HelpModal({ copy, onClose }: HelpModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        aria-labelledby="help-modal-title"
        aria-modal="true"
        className="modal-card help-modal-card"
        role="dialog"
      >
        <div className="help-modal-header">
          <div className="help-modal-title-row">
            <AppIcon className="help-modal-icon" />
            <h2 id="help-modal-title">CliHub</h2>
          </div>
          <button className="ghost-button compact modal-close-button" onClick={onClose} type="button">
            {copy.common.close}
          </button>
        </div>

        <div className="help-modal-body">
          <dl className="help-info-grid">
            <div>
              <dt>{copy.help.version}</dt>
              <dd>{copy.help.values.version}</dd>
            </div>
            <div>
              <dt>{copy.help.author}</dt>
              <dd>{copy.help.values.author}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
