import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModalPageLock } from "../overlays/useModalPageLock";
import { DeviceIcon, DownloadIcon, ShareIcon } from "../ui/icons";

type InstallView = "android" | "ios" | "options";

export function InstallDialog({
  canUseNativeAndroidPrompt,
  onAndroidInstall,
  onClose
}: {
  canUseNativeAndroidPrompt: boolean;
  onAndroidInstall: () => Promise<void>;
  onClose: () => void;
}) {
  useModalPageLock();

  const [isPrompting, setIsPrompting] = useState(false);
  const [view, setView] = useState<InstallView>("options");
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPrompting) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute("disabled"));
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        return;
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPrompting, onClose]);

  const title =
    view === "options"
      ? "How to install FinancePilot"
      : view === "ios"
        ? "Install on iPhone"
        : "Install on Android";

  async function handleAndroidSelection() {
    if (!canUseNativeAndroidPrompt) {
      setView("android");
      return;
    }

    setIsPrompting(true);
    try {
      await onAndroidInstall();
      onClose();
    } finally {
      setIsPrompting(false);
    }
  }

  return createPortal(
    <div className="install-modal-backdrop" onClick={isPrompting ? undefined : onClose} role="presentation">
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="install-modal-sheet install-choice-sheet"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="section-head install-dialog-header">
          <div>
            <p className="section-label">{view === "options" ? "Choose your device" : "Install FinancePilot"}</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            className="icon-button"
            disabled={isPrompting}
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            Close
          </button>
        </div>

        {view === "options" ? (
          <div className="install-platform-grid">
            <button className="install-platform-option" onClick={() => setView("ios")} type="button">
              <span className="install-step-icon" aria-hidden="true"><DeviceIcon /></span>
              <span><strong>iPhone / iOS</strong><small>Safari Home Screen installation</small></span>
            </button>
            <button className="install-platform-option" onClick={() => void handleAndroidSelection()} type="button">
              <span className="install-step-icon" aria-hidden="true"><DownloadIcon /></span>
              <span><strong>Android</strong><small>{canUseNativeAndroidPrompt ? "Open native install" : "View browser steps"}</small></span>
            </button>
          </div>
        ) : null}

        {view === "ios" ? (
          <>
            <div className="install-steps">
              <InstallStep icon={<ShareIcon />} text="1. Tap the Share button in Safari" />
              <InstallStep icon={<DeviceIcon />} text='2. Select "Add to Home Screen"' />
              <InstallStep icon={<DownloadIcon />} text="3. Tap Add" />
            </div>
            <p className="install-usage-copy">FinancePilot will appear like a normal app.</p>
          </>
        ) : null}

        {view === "android" ? (
          <div className="install-steps">
            <InstallStep icon={<DeviceIcon />} text="1. Open the browser menu" />
            <InstallStep icon={<DownloadIcon />} text='2. Select "Install app" or "Add to Home Screen"' />
            <InstallStep icon={<DownloadIcon />} text="3. Confirm installation" />
          </div>
        ) : null}

        {view !== "options" ? (
          <button className="secondary-cta install-back-action" onClick={() => setView("options")} type="button">
            Back to device options
          </button>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

function InstallStep({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="install-step">
      <span className="install-step-icon" aria-hidden="true">{icon}</span>
      <p>{text}</p>
    </div>
  );
}
