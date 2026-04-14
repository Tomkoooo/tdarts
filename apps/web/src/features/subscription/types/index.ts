export type SubscriptionEligibility = {
  canCreate: boolean;
  errorMessage?: string;
  currentCount?: number;
  maxAllowed?: number;
  tierName?: string;
};
