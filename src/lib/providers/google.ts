import type { UsageData, BillingData, DiscoveredKey } from "@/types";
import type { ProviderAdapter } from "./types";

/**
 * Google Gemini provider.
 *
 * Key discovery requires a Google Cloud Service Account (JSON credentials).
 * Usage tracking is limited -- Google does not provide a historical usage API
 * equivalent to OpenAI/Anthropic. We support:
 *   - Key discovery via Cloud API Keys API (requires service account)
 *   - Manual key entry as the primary flow
 *   - Basic model listing as a key validation mechanism
 */

const GENERATIVE_BASE = "https://generativelanguage.googleapis.com/v1beta";
const CLOUD_BASE = "https://apikeys.googleapis.com/v2";

interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key: string;
  client_email: string;
  token_uri: string;
}

async function getAccessToken(credentials: ServiceAccountCredentials): Promise<string> {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform.read-only",
      aud: credentials.token_uri,
      iat: now,
      exp: now + 3600,
    })
  ).toString("base64url");

  const { createSign } = await import("crypto");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(credentials.private_key, "base64url");

  const jwt = `${header}.${payload}.${signature}`;

  const res = await fetch(credentials.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) throw new Error(`Google OAuth failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

export const googleProvider: ProviderAdapter = {
  platform: "google",

  async discoverKeys(adminKeyOrServiceAccount: string): Promise<DiscoveredKey[]> {
    const keys: DiscoveredKey[] = [];

    try {
      const credentials: ServiceAccountCredentials = JSON.parse(adminKeyOrServiceAccount);
      const accessToken = await getAccessToken(credentials);
      const projectNumber = credentials.project_id;

      const res = await fetch(
        `${CLOUD_BASE}/projects/${projectNumber}/locations/global/keys?pageSize=300`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!res.ok) throw new Error(`Google Cloud API ${res.status}: ${await res.text()}`);
      const data = await res.json();

      for (const k of data.keys || []) {
        const name = k.name || "";
        const keyId = name.split("/").pop() || name;
        keys.push({
          externalKeyId: keyId,
          name: k.displayName || keyId,
          redactedValue: k.keyString ? `...${k.keyString.slice(-4)}` : undefined,
          createdAt: k.createTime ? new Date(k.createTime) : undefined,
          projectName: credentials.project_id,
          projectExternalId: credentials.project_id,
        });
      }
    } catch (err) {
      // If not a service account JSON, validate as a simple API key
      const res = await fetch(`${GENERATIVE_BASE}/models?key=${adminKeyOrServiceAccount}`);
      if (res.ok) {
        keys.push({
          externalKeyId: "manual",
          name: `Gemini API Key (manual)`,
          redactedValue: `...${adminKeyOrServiceAccount.slice(-4)}`,
        });
      } else {
        throw new Error(
          `Google key validation failed. For auto-discovery, provide a Service Account JSON. Error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return keys;
  },

  async fetchUsage(_adminKey: string, startDate: Date, endDate: Date): Promise<UsageData[]> {
    /*
     * Google does not provide a historical usage API.
     * Token counts are only available in individual API responses via usage_metadata.
     * For real tracking, users would need Cloud Billing BigQuery export,
     * which requires a much more complex setup.
     *
     * Returning empty array -- usage for Google keys must come from
     * local tracking or Cloud Billing integration (future enhancement).
     */
    void startDate;
    void endDate;
    return [];
  },

  async fetchBilling(_adminKey: string, _startDate: Date, _endDate: Date): Promise<BillingData | null> {
    return null;
  },
};
