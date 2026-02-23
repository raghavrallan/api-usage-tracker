export type Platform = "openai" | "anthropic" | "google";

export type UserRole = "admin" | "user";

export type SyncStatus = "pending" | "running" | "success" | "failed";

export type PermissionLevel = "view" | "manage" | "admin";

export interface UsageData {
  recordedAt: Date;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  requestCount: number;
  userIdExternal?: string;
  projectIdExternal?: string;
  metadataExtra?: Record<string, unknown>;
}

export interface BillingData {
  periodStart: Date;
  periodEnd: Date;
  totalCostUsd: number;
  totalTokens: number;
  breakdown?: Record<string, unknown>;
}

export interface DiscoveredKey {
  externalKeyId: string;
  name: string;
  redactedValue?: string;
  createdAt?: Date;
  projectName?: string;
  projectExternalId?: string;
}

export interface KPIData {
  totalTokens: number;
  totalCost: number;
  activeKeys: number;
  activeProjects: number;
  tokenChange: number;
  costChange: number;
}

export interface UsageTrend {
  date: string;
  tokens: number;
  cost: number;
}

export interface CostBreakdown {
  platform: string;
  cost: number;
}

export interface ModelDistribution {
  model: string;
  tokens: number;
}

export interface TopProject {
  name: string;
  cost: number;
  tokens: number;
}
