import type { UsageData, BillingData, DiscoveredKey } from "@/types";
import type { ProviderAdapter } from "./types";

const BASE = "https://api.openai.com/v1";

async function apiFetch(path: string, adminKey: string, params?: Record<string, string>) {
  const url = new URL(`${BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${adminKey}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI API ${res.status}: ${body}`);
  }
  return res.json();
}

export const openaiProvider: ProviderAdapter = {
  platform: "openai",

  async discoverKeys(adminKey: string): Promise<DiscoveredKey[]> {
    const keys: DiscoveredKey[] = [];

    let hasMore = true;
    let after: string | undefined;
    while (hasMore) {
      const params: Record<string, string> = { limit: "100" };
      if (after) params.after = after;
      const data = await apiFetch("/organization/projects", adminKey, params);
      const projects = data.data || [];

      for (const proj of projects) {
        let keyHasMore = true;
        let keyAfter: string | undefined;
        while (keyHasMore) {
          const keyParams: Record<string, string> = { limit: "100" };
          if (keyAfter) keyParams.after = keyAfter;
          const keyData = await apiFetch(
            `/organization/projects/${proj.id}/api_keys`,
            adminKey,
            keyParams
          );
          for (const k of keyData.data || []) {
            keys.push({
              externalKeyId: k.id,
              name: k.name || `Key ${k.redacted_value}`,
              redactedValue: k.redacted_value,
              createdAt: k.created_at ? new Date(k.created_at * 1000) : undefined,
              projectName: proj.name,
              projectExternalId: proj.id,
            });
          }
          keyHasMore = keyData.has_more || false;
          keyAfter = keyData.last_id;
        }
      }
      hasMore = data.has_more || false;
      after = data.last_id;
    }
    return keys;
  },

  async fetchUsage(adminKey: string, startDate: Date, endDate: Date): Promise<UsageData[]> {
    const results: UsageData[] = [];
    const startTime = Math.floor(startDate.getTime() / 1000);
    const endTime = Math.floor(endDate.getTime() / 1000);

    let page: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const params: Record<string, string> = {
        start_time: startTime.toString(),
        end_time: endTime.toString(),
        bucket_width: "1d",
        group_by: "model,project_id,api_key_id",
        limit: "7",
      };
      if (page) params.page = page;

      const data = await apiFetch("/organization/usage/completions", adminKey, params);

      for (const bucket of data.data || []) {
        const bucketStart = new Date((bucket.start_time || startTime) * 1000);
        for (const result of bucket.results || []) {
          results.push({
            recordedAt: bucketStart,
            model: result.model || "unknown",
            inputTokens: result.input_tokens || 0,
            outputTokens: result.output_tokens || 0,
            totalTokens: (result.input_tokens || 0) + (result.output_tokens || 0),
            costUsd: 0,
            requestCount: result.num_model_requests || 0,
            projectIdExternal: result.project_id,
            metadataExtra: { api_key_id: result.api_key_id },
          });
        }
      }
      hasMore = !!data.next_page;
      page = data.next_page;
    }

    // Fetch costs separately
    try {
      let costPage: string | undefined;
      let costHasMore = true;
      while (costHasMore) {
        const costParams: Record<string, string> = {
          start_time: startTime.toString(),
          end_time: endTime.toString(),
          bucket_width: "1d",
          group_by: "model,project_id",
          limit: "7",
        };
        if (costPage) costParams.page = costPage;

        const costData = await apiFetch("/organization/costs", adminKey, costParams);
        for (const bucket of costData.data || []) {
          const bucketStart = new Date((bucket.start_time || startTime) * 1000);
          for (const result of bucket.results || []) {
            const costUsd = (result.amount?.value || 0) / 100;
            const match = results.find(
              (r) =>
                r.recordedAt.getTime() === bucketStart.getTime() &&
                r.model === (result.model || "unknown") &&
                r.projectIdExternal === result.project_id
            );
            if (match) {
              match.costUsd = costUsd;
            } else {
              results.push({
                recordedAt: bucketStart,
                model: result.model || "unknown",
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
                costUsd,
                requestCount: 0,
                projectIdExternal: result.project_id,
              });
            }
          }
        }
        costHasMore = !!costData.next_page;
        costPage = costData.next_page;
      }
    } catch {
      // Costs API may not be available for all accounts
    }

    return results;
  },

  async fetchBilling(adminKey: string, startDate: Date, endDate: Date): Promise<BillingData | null> {
    try {
      const startTime = Math.floor(startDate.getTime() / 1000);
      const endTime = Math.floor(endDate.getTime() / 1000);
      const data = await apiFetch("/organization/costs", adminKey, {
        start_time: startTime.toString(),
        end_time: endTime.toString(),
        bucket_width: "1d",
      });

      let totalCost = 0;
      const breakdown: Record<string, number> = {};

      for (const bucket of data.data || []) {
        for (const result of bucket.results || []) {
          const cost = (result.amount?.value || 0) / 100;
          totalCost += cost;
          const model = result.line_item || "other";
          breakdown[model] = (breakdown[model] || 0) + cost;
        }
      }

      return {
        periodStart: startDate,
        periodEnd: endDate,
        totalCostUsd: totalCost,
        totalTokens: 0,
        breakdown,
      };
    } catch {
      return null;
    }
  },
};
