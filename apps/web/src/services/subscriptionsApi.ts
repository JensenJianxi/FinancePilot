import { z } from "zod";
import {
  createSubscriptionInputDtoSchema,
  subscriptionDtoSchema,
  updateSubscriptionInputDtoSchema,
  type CreateSubscriptionInputDto,
  type Subscription,
  type SubscriptionDto,
  type UpdateSubscriptionInputDto
} from "@finance-pilot/shared";
import { hasConfiguredApiBaseUrl, requestApi } from "./financeApi";

const deleteSubscriptionResponseSchema = z.object({
  deleted: z.boolean(),
  subscriptionId: z.string().min(1)
});

function toSubscription(subscription: SubscriptionDto): Subscription {
  return subscriptionDtoSchema.parse(subscription);
}

export function isSubscriptionsApiEnabled() {
  return hasConfiguredApiBaseUrl();
}

export async function listSubscriptions(): Promise<Subscription[]> {
  const response = await requestApi<SubscriptionDto[]>("/subscriptions");
  return response.map(toSubscription);
}

export async function createSubscription(
  input: CreateSubscriptionInputDto
): Promise<Subscription> {
  const payload = createSubscriptionInputDtoSchema.parse(input);
  const response = await requestApi<SubscriptionDto>("/subscriptions", {
    body: JSON.stringify(payload),
    method: "POST"
  });

  return toSubscription(response);
}

export async function updateSubscription(
  subscriptionId: string,
  input: UpdateSubscriptionInputDto
): Promise<Subscription> {
  const payload = updateSubscriptionInputDtoSchema.parse(input);
  const response = await requestApi<SubscriptionDto>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      body: JSON.stringify(payload),
      method: "PATCH"
    }
  );

  return toSubscription(response);
}

export async function deleteSubscription(
  subscriptionId: string
): Promise<{ deleted: boolean; subscriptionId: string }> {
  const response = await requestApi<{ deleted: boolean; subscriptionId: string }>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    { method: "DELETE" }
  );

  return deleteSubscriptionResponseSchema.parse(response);
}
