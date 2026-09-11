import type {
  CreateSettingsInputDto,
  SettingsDto,
  SettingsRecord,
  UpdateSettingsInputDto
} from "@finance-pilot/shared";
import {
  createSettingsInputDtoSchema,
  settingsDtoSchema,
  updateSettingsInputDtoSchema
} from "@finance-pilot/shared";
import { AppError } from "../lib/errors";
import type { SettingsCreateInput, SettingsRepository } from "../repositories/SettingsRepository";

const defaultSettings: SettingsCreateInput = {
  animationsEnabled: true,
  budgetCreationEnabled: true,
  currency: "MYR",
  defaultPaymentMethod: "Card",
  defaultTransactionType: "expense",
  language: "en",
  notificationsEnabled: true,
  paymentMethods: ["Card", "Cash", "Bank Transfer"],
  receiptScanningEnabled: true,
  theme: "light"
};

function normalizePaymentMethods(methods: string[]) {
  return Array.from(
    new Set(methods.map((method) => method.trim()).filter(Boolean))
  );
}

function normalizeInput<T extends CreateSettingsInputDto | UpdateSettingsInputDto>(input: T): T {
  if (!input.paymentMethods) {
    return input;
  }

  return {
    ...input,
    paymentMethods: normalizePaymentMethods(input.paymentMethods)
  };
}

function toSettingsDto(record: SettingsRecord): SettingsDto {
  return settingsDtoSchema.parse({
    animationsEnabled: record.animationsEnabled,
    budgetCreationEnabled: record.budgetCreationEnabled ?? true,
    createdAt: record.createdAt,
    currency: record.currency,
    defaultExpenseCategory: record.defaultExpenseCategory ?? record.defaultExpenseCategoryId,
    defaultExpenseCategoryId: record.defaultExpenseCategoryId,
    defaultIncomeCategory: record.defaultIncomeCategory,
    defaultPaymentMethod: record.defaultPaymentMethod,
    defaultTransactionType: record.defaultTransactionType,
    language: record.language,
    notificationsEnabled: record.notificationsEnabled,
    paymentMethods: record.paymentMethods,
    receiptScanningEnabled: record.receiptScanningEnabled ?? true,
    theme: record.theme,
    updatedAt: record.updatedAt
  });
}

export class SettingsService {
  constructor(private readonly repository: SettingsRepository) {}

  async createSettings(userId: string, input: CreateSettingsInputDto): Promise<SettingsDto> {
    this.assertUserId(userId);
    const validatedInput = createSettingsInputDtoSchema.parse(normalizeInput(input));
    const existing = await this.repository.getSettings(userId);
    const nextInput = this.mergeDefaults(validatedInput);

    if (!existing) {
      const created = await this.repository.createSettings(userId, nextInput);
      return toSettingsDto(created);
    }

    const updated = await this.repository.updateSettings(userId, nextInput);

    if (!updated) {
      throw new AppError("Settings could not be saved.", "SETTINGS_SAVE_FAILED", 500);
    }

    return toSettingsDto(updated);
  }

  async getSettings(userId: string): Promise<SettingsDto> {
    this.assertUserId(userId);
    const settings = await this.ensureSettings(userId);

    return toSettingsDto(settings);
  }

  async updateSettings(userId: string, input: UpdateSettingsInputDto): Promise<SettingsDto> {
    this.assertUserId(userId);
    await this.ensureSettings(userId);
    const validatedInput = updateSettingsInputDtoSchema.parse(normalizeInput(input));
    const updated = await this.repository.updateSettings(userId, validatedInput);

    if (!updated) {
      throw new AppError("Settings not found.", "SETTINGS_NOT_FOUND", 404);
    }

    return toSettingsDto(updated);
  }

  private assertUserId(userId: string) {
    if (!userId.trim()) {
      throw new AppError("Authenticated user is required.", "UNAUTHORIZED", 401);
    }
  }

  private async ensureSettings(userId: string) {
    const existing = await this.repository.getSettings(userId);

    if (existing) {
      const upgrade = this.getRecordUpgrade(existing);

      if (Object.keys(upgrade).length === 0) {
        return existing;
      }

      return (await this.repository.updateSettings(userId, upgrade)) ?? existing;
    }

    return this.repository.createSettings(userId, defaultSettings);
  }

  private mergeDefaults(input: CreateSettingsInputDto): SettingsCreateInput {
    return {
      ...defaultSettings,
      ...input,
      defaultExpenseCategory: input.defaultExpenseCategory ?? input.defaultExpenseCategoryId,
      defaultExpenseCategoryId: input.defaultExpenseCategoryId ?? input.defaultExpenseCategory,
      paymentMethods: input.paymentMethods ?? defaultSettings.paymentMethods
    };
  }

  private getRecordUpgrade(record: SettingsRecord): UpdateSettingsInputDto {
    const upgrade: UpdateSettingsInputDto = {};

    if (record.animationsEnabled === undefined) {
      upgrade.animationsEnabled = defaultSettings.animationsEnabled;
    }

    if (record.budgetCreationEnabled === undefined) {
      upgrade.budgetCreationEnabled = defaultSettings.budgetCreationEnabled;
    }

    if (!record.defaultExpenseCategory && record.defaultExpenseCategoryId) {
      upgrade.defaultExpenseCategory = record.defaultExpenseCategoryId;
    }

    if (!record.defaultTransactionType) {
      upgrade.defaultTransactionType = defaultSettings.defaultTransactionType;
    }

    if (!record.language) {
      upgrade.language = defaultSettings.language;
    }

    if (record.receiptScanningEnabled === undefined) {
      upgrade.receiptScanningEnabled = defaultSettings.receiptScanningEnabled;
    }

    return upgrade;
  }
}
