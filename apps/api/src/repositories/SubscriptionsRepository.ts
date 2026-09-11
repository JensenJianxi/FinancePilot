import type {
  CreateSubscriptionInputDto,
  SubscriptionRecord,
  UpdateSubscriptionInputDto
} from "@finance-pilot/shared";

export interface SubscriptionsRepository {
  createSubscription: (
    userId: string,
    input: CreateSubscriptionInputDto
  ) => Promise<SubscriptionRecord>;
  deleteSubscription: (userId: string, subscriptionId: string) => Promise<boolean>;
  getSubscription: (userId: string, subscriptionId: string) => Promise<SubscriptionRecord | null>;
  listUserSubscriptions: (userId: string) => Promise<SubscriptionRecord[]>;
  updateSubscription: (
    userId: string,
    subscriptionId: string,
    input: UpdateSubscriptionInputDto
  ) => Promise<SubscriptionRecord | null>;
}
