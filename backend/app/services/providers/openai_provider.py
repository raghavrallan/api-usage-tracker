from datetime import date, timedelta
from decimal import Decimal

import httpx

from app.services.providers.base import BaseProvider, UsageData, BillingData


class OpenAIProvider(BaseProvider):
    BASE_URL = "https://api.openai.com/v1"

    async def fetch_usage(self, api_key: str, start_date: date, end_date: date) -> list[UsageData]:
        records: list[UsageData] = []
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(
                    f"{self.BASE_URL}/organization/usage/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    params={
                        "start_time": int(start_date.strftime("%s")) if hasattr(start_date, "strftime") else 0,
                        "bucket_width": "1d",
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    for bucket in data.get("data", []):
                        for result in bucket.get("results", []):
                            records.append(UsageData(
                                recorded_at=start_date,
                                model=result.get("model", "unknown"),
                                input_tokens=result.get("input_tokens", 0),
                                output_tokens=result.get("output_tokens", 0),
                                total_tokens=result.get("input_tokens", 0) + result.get("output_tokens", 0),
                                cost_usd=Decimal("0"),
                                request_count=result.get("num_model_requests", 0),
                            ))
                else:
                    # Fallback: try the older billing/usage endpoint
                    records = await self._fetch_usage_legacy(client, api_key, start_date, end_date)
        except Exception:
            pass
        return records

    async def _fetch_usage_legacy(self, client: httpx.AsyncClient, api_key: str, start_date: date, end_date: date) -> list[UsageData]:
        records: list[UsageData] = []
        current = start_date
        while current <= end_date:
            try:
                resp = await client.get(
                    f"{self.BASE_URL}/dashboard/billing/usage",
                    headers={"Authorization": f"Bearer {api_key}"},
                    params={"date": current.isoformat()},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    for line_item in data.get("daily_costs", []):
                        for item in line_item.get("line_items", []):
                            records.append(UsageData(
                                recorded_at=current,
                                model=item.get("name", "unknown"),
                                total_tokens=0,
                                cost_usd=Decimal(str(item.get("cost", 0))) / Decimal("100"),
                                request_count=0,
                            ))
            except Exception:
                pass
            current += timedelta(days=1)
        return records

    async def fetch_billing(self, api_key: str, start_date: date, end_date: date) -> BillingData | None:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(
                    f"{self.BASE_URL}/dashboard/billing/subscription",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return BillingData(
                        period_start=start_date,
                        period_end=end_date,
                        total_cost_usd=Decimal(str(data.get("hard_limit_usd", 0))),
                        breakdown=data,
                    )
        except Exception:
            pass
        return None
