import assert from "node:assert/strict";
import test from "node:test";
import type {
  SettingsRecord,
  UpdateSettingsInputDto
} from "@finance-pilot/shared";
import { SettingsService } from "./SettingsService";
import type {
  SettingsCreateInput,
  SettingsRepository
} from "../repositories/SettingsRepository";

class InMemorySettingsRepository implements SettingsRepository {
  private record: SettingsRecord | null = null;

  async createSettings(userId: string, input: SettingsCreateInput) {
    const now = "2026-08-28T00:00:00.000Z";
    this.record = {
      ...input,
      createdAt: now,
      entityType: "settings",
      updatedAt: now,
      userId,
      version: 1
    };
    return this.record;
  }

  async getSettings(userId: string) {
    return this.record?.userId === userId ? this.record : null;
  }

  async updateSettings(userId: string, input: UpdateSettingsInputDto) {
    if (!this.record || this.record.userId !== userId) {
      return null;
    }

    this.record = {
      ...this.record,
      ...input,
      updatedAt: "2026-08-28T00:01:00.000Z",
      version: this.record.version + 1
    };
    return this.record;
  }
}

test("SettingsService persists optional feature preferences", async () => {
  const service = new SettingsService(new InMemorySettingsRepository());

  await service.getSettings("user-1");
  const settings = await service.updateSettings("user-1", {
    budgetCreationEnabled: false,
    receiptScanningEnabled: false
  });

  assert.equal(settings.budgetCreationEnabled, false);
  assert.equal(settings.receiptScanningEnabled, false);
});
