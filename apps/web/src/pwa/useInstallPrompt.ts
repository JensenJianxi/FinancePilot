import { useSyncExternalStore } from "react";
import { getInstallPlatformState, type InstallPlatform } from "./installPlatform";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

export type InstallAvailability =
  | "available"
  | "installed"
  | "ios-instructions"
  | "unavailable"
  | "unsupported";

export type InstallActionResult =
  | { status: "accepted" | "dismissed" | "error" | "installed" | "ios-instructions" | "unavailable" | "unsupported"; message?: string };

export interface InstallPromptSnapshot {
  availability: InstallAvailability;
  isInstalled: boolean;
  platform: InstallPlatform;
  supportsNativePrompt: boolean;
}

let initialized = false;
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedInSession = false;
const listeners = new Set<() => void>();
let cachedSnapshot: InstallPromptSnapshot | null = null;

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  initializeInstallPrompt();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function createSnapshot(): InstallPromptSnapshot {
  try {
    const platformState = getInstallPlatformState();

    if (platformState.isInstalled || installedInSession) {
      return {
        availability: "installed",
        isInstalled: true,
        platform: platformState.platform,
        supportsNativePrompt: platformState.supportsNativePrompt
      };
    }

    if (platformState.isIosSafari) {
      return {
        availability: "ios-instructions",
        isInstalled: false,
        platform: platformState.platform,
        supportsNativePrompt: false
      };
    }

    if (deferredPrompt) {
      return {
        availability: "available",
        isInstalled: false,
        platform: platformState.platform,
        supportsNativePrompt: true
      };
    }

    return {
      availability: platformState.supportsNativePrompt ? "unavailable" : "unsupported",
      isInstalled: false,
      platform: platformState.platform,
      supportsNativePrompt: platformState.supportsNativePrompt
    };
  } catch {
    return {
      availability: "unsupported",
      isInstalled: false,
      platform: "other",
      supportsNativePrompt: false
    };
  }
}

function snapshotsMatch(left: InstallPromptSnapshot, right: InstallPromptSnapshot) {
  return (
    left.availability === right.availability &&
    left.isInstalled === right.isInstalled &&
    left.platform === right.platform &&
    left.supportsNativePrompt === right.supportsNativePrompt
  );
}

export function getInstallPromptSnapshot(): InstallPromptSnapshot {
  const nextSnapshot = createSnapshot();

  if (cachedSnapshot && snapshotsMatch(cachedSnapshot, nextSnapshot)) {
    return cachedSnapshot;
  }

  cachedSnapshot = nextSnapshot;
  return cachedSnapshot;
}

function handleDisplayModeChange() {
  emitChange();
}

export function initializeInstallPrompt() {
  if (initialized || typeof window === "undefined") {
    return;
  }

  initialized = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emitChange();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installedInSession = true;
    emitChange();
  });

  window.addEventListener("pageshow", handleDisplayModeChange);
  document.addEventListener("visibilitychange", handleDisplayModeChange);

  if (typeof window.matchMedia === "function") {
    try {
      const standaloneMedia = window.matchMedia("(display-mode: standalone)");
      const legacyStandaloneMedia = standaloneMedia as MediaQueryList & {
        addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      };

      if ("addEventListener" in standaloneMedia) {
        standaloneMedia.addEventListener("change", handleDisplayModeChange);
      } else if (typeof legacyStandaloneMedia.addListener === "function") {
        legacyStandaloneMedia.addListener(handleDisplayModeChange);
      }
    } catch {
      emitChange();
    }
  }
}

export async function promptToInstall(): Promise<InstallActionResult> {
  initializeInstallPrompt();

  const snapshot = getInstallPromptSnapshot();

  if (snapshot.availability === "installed") {
    return { status: "installed" };
  }

  if (snapshot.availability === "ios-instructions") {
    return { status: "ios-instructions" };
  }

  if (snapshot.availability === "unsupported") {
    return {
      status: "unsupported",
      message: "This browser does not support FinancePilot's direct install prompt."
    };
  }

  if (!deferredPrompt) {
    return {
      status: "unavailable",
      message: "Install is not available in this browser session yet."
    };
  }

  const installPrompt = deferredPrompt;
  deferredPrompt = null;
  emitChange();

  try {
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    emitChange();

    return {
      status: choice.outcome,
      message:
        choice.outcome === "accepted"
          ? "FinancePilot is being added to your device."
          : "Install was dismissed."
    };
  } catch {
    emitChange();
    return {
      status: "error",
      message: "FinancePilot could not start the install prompt right now."
    };
  }
}

export function useInstallPrompt() {
  return useSyncExternalStore(
    subscribe,
    getInstallPromptSnapshot,
    getInstallPromptSnapshot
  );
}
