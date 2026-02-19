from datetime import date
from decimal import Decimal

import httpx

from app.services.providers.base import BaseProvider, UsageData, BillingData


class GoogleProvider(BaseProvider):
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

    async def fetch_usage(self, api_key: str, start_date: date, end_date: date) -> list[UsageData]:
        records: list[UsageData] = []
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(
                    f"{self.BASE_URL}/models",
                    params={"key": api_key},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    for model in data.get("models", []):
                        model_name = model.get("name", "").replace("models/", "")
                        if model_name:
                            records.append(UsageData(
                                recorded_at=start_date,
                                model=model_name,
                                input_tokens=0,
                                output_tokens=0,
                                total_tokens=0,
                                cost_usd=Decimal("0"),
                                request_count=0,
                                metadata_extra={"source": "google-ai-studio", "status": "available"},
                            ))
        except Exception:
            pass
        return records

    async def fetch_billing(self, api_key: str, start_date: date, end_date: date) -> BillingData | None:
        return None
