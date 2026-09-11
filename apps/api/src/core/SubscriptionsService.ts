import type {
  CreateSubscriptionInputDto,
  SubscriptionDto,
  SubscriptionRecord,
  UpdateSubscriptionInputDto
} from "@finance-pilot/shared";
import {
  createSubscriptionInputDtoSchema,
  subscriptionDtoSchema,
  updateSubscriptionInputDtoSchema
} from "@finance-pilot/shared";
import { AppError } from "../lib/errors";
import type { SubscriptionsRepository } from "../repositories/SubscriptionsRepository";

function toSubscriptionDto(record: SubscriptionRecord): SubscriptionDto {
  return subscriptionDtoSchema.parse({
    active: record.active,
    amount: record.amount,
    autoCreateTransaction: record.autoCreateTransaction,
    categoryId: record.categoryId,
    categoryName: record.categoryName,
    createdAt: record.createdAt,
    frequency: record.frequency,
    id: record.subscriptionId,
    name: record.name,
    nextPaymentDate: record.nextPaymentDate,
    paymentMethod: record.paymentMethod,
    updatedAt: record.updatedAt
  });
}

export class SubscriptionsService {
  constructor(private readonly repository: SubscriptionsRepository) {}

  async createSubscription(
    userId: string,
    input: CreateSubscriptionInputDto
  ): Promise<SubscriptionDto> {
    this.assertUserId(userId);
    const validatedInput = createSubscriptionInputDtoSchema.parse(input);
    const created = await this.repository.createSubscription(userId, validatedInput);

    return toSubscriptionDto(created);
  }

  async deleteSubscription(userId: string, subscriptionId: string) {
    this.assertUserId(userId);
    this.assertSubscriptionId(subscriptionId);
    const deleted = await this.repository.deleteSubscription(userId, subscriptionId);

    if (!deleted) {
      throw new AppError("Subscription not found.", "SUBSCRIPTION_NOT_FOUND", 404);
    }

    return {
      deleted: true,
      subscriptionId
    };
  }

  async listSubscriptions(userId: string): Promise<SubscriptionDto[]> {
    this.assertUserId(userId);
    const subscriptions = await this.repository.listUserSubscriptions(userId);

    return subscriptions.map(toSubscriptionDto);
  }

  async updateSubscription(
    userId: string,
    subscriptionId: string,
    input: UpdateSubscriptionInputDto
  ): Promise<SubscriptionDto> {
    this.assertUserId(userId);
    this.assertSubscriptionId(subscriptionId);
    const validatedInput = updateSubscriptionInputDtoSchema.parse(input);
    const updated = await this.repository.updateSubscription(userId, subscriptionId, validatedInput);

    if (!updated) {
      throw new AppError("Subscription not found.", "SUBSCRIPTION_NOT_FOUND", 404);
    }

    return toSubscriptionDto(updated);
  }

  private assertSubscriptionId(subscriptionId: string) {
    if (!subscriptionId.trim()) {
      throw new AppError("Subscription ID is required.", "SUBSCRIPTION_ID_REQUIRED", 400);
    }
  }

  private assertUserId(userId: string) {
    if (!userId.trim()) {
      throw new AppError("Authenticated user is required.", "UNAUTHORIZED", 401);
    }
  }
}
