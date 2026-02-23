import type { UsageData, BillingData, DiscoveredKey } from "@/types";

export interface ProviderAdapter {
  readonly platform: string;
  discoverKeys(adminKey: string): Promise<DiscoveredKey[]>;
  fetchUsage(adminKey: string, startDate: Date, endDate: Date): Promise<UsageData[]>;
  fetchBilling(adminKey: string, startDate: Date, endDate: Date): Promise<BillingData | null>;
}
