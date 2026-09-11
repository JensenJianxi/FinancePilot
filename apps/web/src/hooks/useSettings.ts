import type { Settings } from "@finance-pilot/shared";
import { useQuery } from "@tanstack/react-query";
import { useUiStore } from "../app/useUiStore";
import {
  defaultSettings,
  getSettings,
  isSettingsApiEnabled
} from "../services/settingsApi";

export const settingsQueryKey = ["settings"];

export function useSettings() {
  const localSettings = useUiStore((state) => state.localSettings);
  const shouldUseSettingsApi = isSettingsApiEnabled();
  const settings = useQuery({
    enabled: shouldUseSettingsApi,
    queryKey: settingsQueryKey,
    queryFn: getSettings
  });

  if (shouldUseSettingsApi) {
    return {
      ...settings,
      data: settings.data,
      isUsingLiveSettings: true as const
    };
  }

  return {
    data: localSettings ?? defaultSettings,
    error: null,
    isError: false,
    isLoading: false,
    isUsingLiveSettings: false as const,
    refetch: async () => ({ data: localSettings ?? defaultSettings }) as { data: Settings }
  };
}
