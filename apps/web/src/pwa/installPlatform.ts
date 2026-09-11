export type InstallPlatform = "chromium" | "ios" | "other";

interface StandaloneNavigator extends Navigator {
  standalone?: boolean;
}

export interface InstallPlatformState {
  isInstalled: boolean;
  isIos: boolean;
  isIosSafari: boolean;
  platform: InstallPlatform;
  supportsNativePrompt: boolean;
}

function getSafeMatchMedia(query: string) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return undefined;
  }

  try {
    return window.matchMedia(query);
  } catch {
    return undefined;
  }
}

function getNavigator() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.navigator;
}

export function isStandaloneDisplayMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const browserNavigator = window.navigator as StandaloneNavigator;
  const standaloneMedia = getSafeMatchMedia("(display-mode: standalone)");
  const fullscreenMedia = getSafeMatchMedia("(display-mode: fullscreen)");

  return (
    Boolean(standaloneMedia?.matches) ||
    Boolean(fullscreenMedia?.matches) ||
    browserNavigator.standalone === true
  );
}

export function getInstallPlatformState(): InstallPlatformState {
  try {
    const browserNavigator = getNavigator();

    if (!browserNavigator) {
      return {
        isInstalled: false,
        isIos: false,
        isIosSafari: false,
        platform: "other",
        supportsNativePrompt: false
      };
    }

    const userAgent = browserNavigator.userAgent ?? "";
    const platform = browserNavigator.platform ?? "";
    const maxTouchPoints = typeof browserNavigator.maxTouchPoints === "number" ? browserNavigator.maxTouchPoints : 0;
    const isTouchMac = platform === "MacIntel" && maxTouchPoints > 1;
    const isIos =
      /iPad|iPhone|iPod/.test(userAgent) ||
      /iPad|iPhone|iPod/.test(platform) ||
      isTouchMac;
    const isIosSafari =
      isIos &&
      /Safari/.test(userAgent) &&
      !/(CriOS|FxiOS|EdgiOS|OPiOS)/.test(userAgent);
    const isChromium =
      !isIos &&
      /(Chrome|Chromium|Edg|OPR|SamsungBrowser)/.test(userAgent) &&
      !/Firefox/.test(userAgent);

    return {
      isInstalled: isStandaloneDisplayMode(),
      isIos,
      isIosSafari,
      platform: isIos ? "ios" : isChromium ? "chromium" : "other",
      supportsNativePrompt: isChromium
    };
  } catch {
    return {
      isInstalled: false,
      isIos: false,
      isIosSafari: false,
      platform: "other",
      supportsNativePrompt: false
    };
  }
}
