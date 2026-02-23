import type { UsageData, BillingData, DiscoveredKey } from "@/types";
import type { ProviderAdapter } from "./types";

const BASE = "https://api.anthropic.com/v1";

async function apiFetch(path: string, adminKey: string, params?: Record<string, string>) {
  const url = new URL(`${BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: {
      "x-api-key": adminKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${body}`);
  }
  return res.json();
}

// Model pricing per million tokens (approximate)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
  "claude-3-5-haiku-20241022": { input: 0.8, output: 4.0 },
  "claude-3-opus-20240229": { input: 15.0, output: 75.0 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || { input: 3.0, output: 15.0 };
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

export const anthropicProvider: ProviderAdapter = {
  platform: "anthropic",

  async discoverKeys(adminKey: string): Promise<DiscoveredKey[]> {
    const keys: DiscoveredKey[] = [];
    let hasMore = true;
    let afterId: string | undefined;

    while (hasMore) {
      const params: Record<string, string> = { limit: "100", status: "active" };
      if (afterId) params.after_id = afterId;

      const data = await apiFetch("/organizations/api_keys", adminKey, params);

      for (const k of data.data || []) {
        keys.push({
          externalKeyId: k.id,
          name: k.name || `Key ${k.partial_key_hint || "unknown"}`,
          redactedValue: k.partial_key_hint,
          createdAt: k.created_at ? new Date(k.created_at) : undefined,
          projectName: k.workspace_id || undefined,
          projectExternalId: k.workspace_id || undefined,
        });
      }

      hasMore = data.has_more || false;
      afterId = data.last_id;
    }

    return keys;
  },

  async fetchUsage(adminKey: string, startDate: Date, endDate: Date): Promise<UsageData[]> {
    const results: UsageData[] = [];
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    let page: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const params: Record<string, string> = {
        start_date: startDateStr,
        end_date: endDateStr,
        group_by: "model,api_key",
        granularity: "day",
        limit: "1000",
      };
      if (page) params.page = page;

      const data = await apiFetch("/organizations/usage", adminKey, params);

      for (const bucket of data.data || []) {
        const recordedAt = new Date(bucket.snapshot_date || bucket.date || startDateStr);
        const inputTokens = bucket.input_tokens || 0;
        const outputTokens = bucket.output_tokens || 0;
        const model = bucket.model || "unknown";

        results.push({
          recordedAt,
          model,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          costUsd: estimateCost(model, inputTokens, outputTokens),
          requestCount: bucket.request_count || 0,
          metadataExtra: {
            api_key_id: bucket.api_key_id,
            cache_creation_input_tokens: bucket.cache_creation_input_tokens || 0,
            cache_read_input_tokens: bucket.cache_read_input_tokens || 0,
          },
        });
      }

      hasMore = !!data.next_page;
      page = data.next_page;
    }

    return results;
  },

  async fetchBilling(adminKey: string, startDate: Date, endDate: Date): Promise<BillingData | null> {
    try {
      const usage = await this.fetchUsage(adminKey, startDate, endDate);
      let totalCost = 0;
      let totalTokens = 0;
      const breakdown: Record<string, number> = {};

      for (const record of usage) {
        totalCost += record.costUsd;
        totalTokens += record.totalTokens;
        breakdown[record.model] = (breakdown[record.model] || 0) + record.costUsd;
      }

      return {
        periodStart: startDate,
        periodEnd: endDate,
        totalCostUsd: totalCost,
        totalTokens,
        breakdown,
      };
    } catch {
      return null;
    }
  },
};
