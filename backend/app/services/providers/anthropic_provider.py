from datetime import date, timedelta
from decimal import Decimal

import httpx

from app.services.providers.base import BaseProvider, UsageData, BillingData


class AnthropicProvider(BaseProvider):
    BASE_URL = "https://api.anthropic.com/v1"

    async def fetch_usage(self, api_key: str, start_date: date, end_date: date) -> list[UsageData]:
        records: list[UsageData] = []
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                page_token = None
                while True:
                    params = {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        "limit": 100,
                    }
                    if page_token:
                        params["after_id"] = page_token

                    resp = await client.get(
                        f"{self.BASE_URL}/messages/usage",
                        headers={
                            "x-api-key": api_key,
                            "anthropic-version": "2023-06-01",
                        },
                        params=params,
                    )
                    if resp.status_code != 200:
                        break

                    data = resp.json()
                    for item in data.get("data", []):
                        records.append(UsageData(
                            recorded_at=date.fromisoformat(item.get("date", start_date.isoformat())),
                            model=item.get("model", "unknown"),
                            input_tokens=item.get("input_tokens", 0),
                            output_tokens=item.get("output_tokens", 0),
                            total_tokens=item.get("input_tokens", 0) + item.get("output_tokens", 0),
                            cost_usd=Decimal("0"),
                            request_count=item.get("num_requests", 0),
                        ))

                    if not data.get("has_more"):
                        break
                    page_token = data.get("last_id")
        except Exception:
            pass
        return records

    async def fetch_billing(self, api_key: str, start_date: date, end_date: date) -> BillingData | None:
        return None
