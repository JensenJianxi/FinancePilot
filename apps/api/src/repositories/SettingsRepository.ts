import type {
  CreateSettingsInputDto,
  SettingsRecord,
  UpdateSettingsInputDto
} from "@finance-pilot/shared";

export type SettingsCreateInput = CreateSettingsInputDto & {
  animationsEnabled: NonNullable<CreateSettingsInputDto["animationsEnabled"]>;
  budgetCreationEnabled: NonNullable<CreateSettingsInputDto["budgetCreationEnabled"]>;
  currency: NonNullable<CreateSettingsInputDto["currency"]>;
  defaultTransactionType: NonNullable<CreateSettingsInputDto["defaultTransactionType"]>;
  language: NonNullable<CreateSettingsInputDto["language"]>;
  notificationsEnabled: NonNullable<CreateSettingsInputDto["notificationsEnabled"]>;
  paymentMethods: NonNullable<CreateSettingsInputDto["paymentMethods"]>;
  receiptScanningEnabled: NonNullable<CreateSettingsInputDto["receiptScanningEnabled"]>;
  theme: NonNullable<CreateSettingsInputDto["theme"]>;
};

export interface SettingsRepository {
  createSettings: (userId: string, input: SettingsCreateInput) => Promise<SettingsRecord>;
  getSettings: (userId: string) => Promise<SettingsRecord | null>;
  updateSettings: (userId: string, input: UpdateSettingsInputDto) => Promise<SettingsRecord | null>;
}
