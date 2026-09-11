import { useState } from "react";
import { DownloadIcon } from "../ui/icons";
import { InstallDialog } from "./InstallDialog";

export function InstallFallbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="install-app-card">
        <div className="install-app-card-content">
          <span className="install-app-card-icon" aria-hidden="true"><DownloadIcon /></span>
          <div className="install-app-card-copy">
            <span>Progressive Web App</span>
            <strong>Install FinancePilot</strong>
            <p>Add FinancePilot to your Home Screen like a native application.</p>
          </div>
        </div>
        <button className="install-app-action" onClick={() => setIsOpen(true)} type="button">Install</button>
      </div>

      {isOpen ? (
        <InstallDialog
          canUseNativeAndroidPrompt={false}
          onAndroidInstall={async () => undefined}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </>
  );
}
