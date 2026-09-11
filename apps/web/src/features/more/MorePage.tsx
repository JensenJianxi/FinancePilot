import { useState, type ReactNode } from "react";
import type { Settings, UpdateSettingsInputDto } from "@finance-pilot/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/AuthProvider";
import { useUiStore } from "../../app/useUiStore";
import { AccountEntry } from "../../components/account/AccountEntry";
import { ErrorState } from "../../components/feedback/ErrorState";
import { FeatureBoundary } from "../../components/feedback/FeatureBoundary";
import { LoadingState } from "../../components/feedback/LoadingState";
import { InstallAppButton } from "../../components/pwa/InstallAppButton";
import { InstallFallbackButton } from "../../components/pwa/InstallFallbackButton";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { useCategories } from "../../hooks/useCategories";
import { settingsQueryKey, useSettings } from "../../hooks/useSettings";
import {
  isSettingsApiEnabled,
  updateSettings as updateSettingsRequest
} from "../../services/settingsApi";
import { DefaultPreferencesDialog } from "./components/DefaultPreferencesDialog";

function getInitials(value: string): string {
  return value.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default function MorePage() {
  const { signOut, user } = useAuth();
  const categories = useCategories();
  const settings = useSettings();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const resetUserState = useUiStore((state) => state.resetUserState);
  const setLocalSettings = useUiStore((state) => state.setLocalSettings);
  const [isDefaultsOpen, setIsDefaultsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null);
  const shouldUseSettingsApi = isSettingsApiEnabled();
  const settingsData = settings.data;
  const expenseCategories = (categories.data ?? []).filter((category) => category.type === "expense");
  const incomeCategories = (categories.data ?? []).filter((category) => category.type === "income");

  const settingsMutation = useMutation({
    mutationFn: async (input: UpdateSettingsInputDto) => {
      if (!settingsData) {
        throw new Error("Settings are still loading.");
      }

      if (!shouldUseSettingsApi) {
        const nextSettings: Settings = {
          ...settingsData,
          ...input,
          updatedAt: new Date().toISOString()
        };
        setLocalSettings(nextSettings);
        return nextSettings;
      }

      return updateSettingsRequest(input);
    },
    onSuccess: (nextSettings) => {
      queryClient.setQueryData(settingsQueryKey, nextSettings);
      setLocalSettings(nextSettings);
      setSettingsFeedback("Saved successfully.");
    },
    onError: () => {
      setSettingsFeedback(null);
    }
  });

  function saveSetting(input: UpdateSettingsInputDto) {
    settingsMutation.mutate(input);
  }

  async function signOutSecurely() {
    setIsSigningOut(true);

    try {
      await signOut();
    } finally {
      queryClient.clear();
      resetUserState();
      navigate("/login", { replace: true });
    }
  }

  if (settings.isLoading) {
    return <LoadingState label="Opening more options" />;
  }

  if (settings.isError || !settingsData) {
    return (
      <ErrorState
        message={
          settings.error instanceof Error
            ? settings.error.message
            : "FinancePilot could not load the account workspace."
        }
        onRetry={() => {
          void settings.refetch();
        }}
        title="More options are unavailable."
      />
    );
  }

  return (
    <div className="page-shell more-page">
      <ScreenHeader
        eyebrow="More"
        title="Account and preferences"
      />

      <section className="more-layout">
        <section className="soft-card menu-list">
          <AccountEntry
            avatarLabel={user ? getInitials(user.fullName) : undefined}
            href="/profile"
            label={user?.fullName ?? "FinancePilot account"}
            sublabel={user?.email ?? "Signed in session"}
          />

          <div className="menu-section">
            <p className="section-label">App</p>
            <FeatureBoundary fallback={<InstallFallbackButton />}>
              <InstallAppButton />
            </FeatureBoundary>
          </div>

          <div className="menu-section">
            <p className="section-label">Preferences</p>
            <PreferenceSelect
              disabled={settingsMutation.isPending}
              label="Language"
              onChange={(value) => saveSetting({ language: value as Settings["language"] })}
              value={settingsData.language}
            >
              <option value="en">English</option>
              <option value="ms">Bahasa Melayu</option>
              <option value="zh-CN">Chinese (Simplified)</option>
            </PreferenceSelect>

            <PreferenceSelect
              disabled={settingsMutation.isPending}
              label="Currency"
              onChange={(value) => saveSetting({ currency: value as Settings["currency"] })}
              value={settingsData.currency}
            >
              <option value="MYR">MYR</option>
              <option value="USD">USD</option>
              <option value="SGD">SGD</option>
            </PreferenceSelect>

            <PreferenceSelect
              disabled={settingsMutation.isPending}
              label="Theme"
              onChange={(value) => saveSetting({ theme: value as Settings["theme"] })}
              value={settingsData.theme}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </PreferenceSelect>

            <PreferenceSelect
              disabled={settingsMutation.isPending}
              label="Animations"
              onChange={(value) => saveSetting({ animationsEnabled: value === "enabled" })}
              value={settingsData.animationsEnabled ? "enabled" : "disabled"}
            >
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </PreferenceSelect>

            <PreferenceSelect
              disabled={settingsMutation.isPending}
              label="Notifications"
              onChange={(value) => saveSetting({ notificationsEnabled: value === "enabled" })}
              value={settingsData.notificationsEnabled ? "enabled" : "disabled"}
            >
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </PreferenceSelect>

            <PreferenceSelect
              disabled={settingsMutation.isPending}
              label="Receipt scanning"
              onChange={(value) => saveSetting({ receiptScanningEnabled: value === "enabled" })}
              value={settingsData.receiptScanningEnabled ? "enabled" : "disabled"}
            >
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </PreferenceSelect>

            <PreferenceSelect
              disabled={settingsMutation.isPending}
              label="Create budgets"
              onChange={(value) => saveSetting({ budgetCreationEnabled: value === "enabled" })}
              value={settingsData.budgetCreationEnabled ? "enabled" : "disabled"}
            >
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </PreferenceSelect>

            <button
              className="menu-row menu-row-button default-preferences-trigger"
              onClick={() => setIsDefaultsOpen(true)}
              type="button"
            >
              <div className="menu-row-content">
                <strong>Default preferences</strong>
              </div>
              <span className="default-preferences-action">Configure</span>
            </button>
          </div>

          {settingsMutation.isError ? (
            <p className="form-banner form-banner-error">
              FinancePilot could not save this preference. Please try again.
            </p>
          ) : null}
          {settingsFeedback ? (
            <p className="form-banner form-banner-success" role="status">{settingsFeedback}</p>
          ) : null}
        </section>

        <section className="soft-card account-access-card">
          <div className="section-head">
            <div>
              <p className="section-label">Account access</p>
              <h3>Secure sign-out</h3>
            </div>
          </div>
          <button
            className="text-button account-signout-action"
            disabled={isSigningOut}
            onClick={() => void signOutSecurely()}
            type="button"
          >
            {isSigningOut ? "Signing out..." : "Log out"}
          </button>
        </section>
      </section>

      {isDefaultsOpen ? (
        <DefaultPreferencesDialog
          expenseCategories={expenseCategories}
          incomeCategories={incomeCategories}
          onClose={() => setIsDefaultsOpen(false)}
          onFeedback={setSettingsFeedback}
          onSave={async (input) => {
            await settingsMutation.mutateAsync(input);
          }}
          settings={settingsData}
        />
      ) : null}
    </div>
  );
}

function PreferenceSelect({
  children,
  disabled,
  label,
  onChange,
  value
}: {
  children: ReactNode;
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="menu-row menu-row-responsive">
      <div className="menu-row-content">
        <strong>{label}</strong>
      </div>
      <select
        className="menu-row-select"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}
