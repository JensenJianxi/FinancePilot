import { useMemo, useState } from "react";
import { DownloadIcon } from "../ui/icons";
import { InstallDialog } from "./InstallDialog";
import { promptToInstall, useInstallPrompt } from "../../pwa/useInstallPrompt";

type FeedbackTone = "error" | "info" | "success";

function getButtonCopy(availability: ReturnType<typeof useInstallPrompt>["availability"]) {
  if (availability === "installed") {
    return {
      actionLabel: "Installed",
      label: "FinancePilot Installed",
      sublabel: "Open it from your Home Screen for a focused, full-screen finance experience."
    };
  }

  if (availability === "ios-instructions") {
    return {
      actionLabel: "View steps",
      label: "Install FinancePilot",
      sublabel: "Add FinancePilot to your Home Screen like a native application."
    };
  }

  if (availability === "available") {
    return {
      actionLabel: "Install",
      label: "Install FinancePilot",
      sublabel: "Add FinancePilot to your Home Screen like a native application."
    };
  }

  if (availability === "unsupported") {
    return {
      actionLabel: "View options",
      label: "Install FinancePilot",
      sublabel: "Add FinancePilot to your Home Screen like a native application."
    };
  }

  return {
    actionLabel: "View options",
    label: "Install FinancePilot",
    sublabel: "Add FinancePilot to your Home Screen like a native application."
  };
}

export function InstallAppButton() {
  const installPrompt = useInstallPrompt();
  const [feedback, setFeedback] = useState<{ message: string; tone: FeedbackTone } | null>(null);
  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false);
  const copy = useMemo(() => getButtonCopy(installPrompt.availability), [installPrompt.availability]);

  async function handleAndroidInstall() {
    setFeedback(null);

    const result = await promptToInstall();

    if (result.status === "accepted" || result.status === "installed") {
      setFeedback({
        message: result.message ?? "FinancePilot is being added to your device.",
        tone: "success"
      });
      return;
    }

    if (result.status === "dismissed") {
      setFeedback({
        message: result.message ?? "Install was dismissed.",
        tone: "info"
      });
      return;
    }

    setFeedback({
      message:
        result.message ??
        (result.status === "unsupported"
          ? "This browser does not support FinancePilot's install prompt."
          : "Install is not available right now."),
      tone: result.status === "unsupported" ? "info" : "error"
    });
  }

  return (
    <>
      <div className={`install-app-card${installPrompt.isInstalled ? " install-app-card-installed" : ""}`}>
        <div className="install-app-card-content">
          <span className="install-app-card-icon" aria-hidden="true">
            <DownloadIcon />
          </span>
          <div className="install-app-card-copy">
            <span>Progressive Web App</span>
            <strong>{copy.label}</strong>
            <p>{copy.sublabel}</p>
          </div>
        </div>

        {installPrompt.isInstalled ? (
          <span className="install-app-installed-status">Installed</span>
        ) : (
          <button
            aria-label={`${copy.actionLabel} FinancePilot`}
            className="install-app-action"
            onClick={() => {
              setFeedback(null);
              setIsInstallDialogOpen(true);
            }}
            type="button"
          >
            {copy.actionLabel}
          </button>
        )}

        {feedback ? (
          <p className={`form-banner form-banner-${feedback.tone} install-app-feedback`} role="status">
            {feedback.message}
          </p>
        ) : null}
      </div>

      {isInstallDialogOpen ? (
        <InstallDialog
          canUseNativeAndroidPrompt={installPrompt.availability === "available"}
          onAndroidInstall={handleAndroidInstall}
          onClose={() => {
            setIsInstallDialogOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
