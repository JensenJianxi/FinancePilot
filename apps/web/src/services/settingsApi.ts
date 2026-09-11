import {
  createSettingsInputDtoSchema,
  settingsDtoSchema,
  updateSettingsInputDtoSchema,
  type CreateSettingsInputDto,
  type Settings,
  type UpdateSettingsInputDto
} from "@finance-pilot/shared";
import { hasConfiguredApiBaseUrl, requestApi } from "./financeApi";

export const defaultSettings: Settings = {
  animationsEnabled: true,
  budgetCreationEnabled: true,
  createdAt: new Date(0).toISOString(),
  currency: "MYR",
  defaultPaymentMethod: "Card",
  defaultTransactionType: "expense",
  language: "en",
  notificationsEnabled: true,
  paymentMethods: ["Card", "Cash", "Bank Transfer"],
  receiptScanningEnabled: true,
  theme: "light",
  updatedAt: new Date(0).toISOString()
};

export function isSettingsApiEnabled() {
  return hasConfiguredApiBaseUrl();
}

export async function getSettings(): Promise<Settings> {
  const response = await requestApi<Settings>("/settings");
  return settingsDtoSchema.parse(response);
}

export async function createSettings(input: CreateSettingsInputDto): Promise<Settings> {
  const payload = createSettingsInputDtoSchema.parse(input);
  const response = await requestApi<Settings>("/settings", {
    body: JSON.stringify(payload),
    method: "POST"
  });

  return settingsDtoSchema.parse(response);
}

export async function updateSettings(input: UpdateSettingsInputDto): Promise<Settings> {
  const payload = updateSettingsInputDtoSchema.parse(input);
  const response = await requestApi<Settings>("/settings", {
    body: JSON.stringify(payload),
    method: "PATCH"
  });

  return settingsDtoSchema.parse(response);
}
