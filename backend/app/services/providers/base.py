from abc import ABC, abstractmethod
from datetime import date
from dataclasses import dataclass, field
from decimal import Decimal


@dataclass
class UsageData:
    recorded_at: date
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    cost_usd: Decimal = Decimal("0")
    request_count: int = 0
    metadata_extra: dict | None = None


@dataclass
class BillingData:
    period_start: date
    period_end: date
    total_cost_usd: Decimal = Decimal("0")
    total_tokens: int = 0
    breakdown: dict = field(default_factory=dict)


class BaseProvider(ABC):
    @abstractmethod
    async def fetch_usage(self, api_key: str, start_date: date, end_date: date) -> list[UsageData]:
        ...

    @abstractmethod
    async def fetch_billing(self, api_key: str, start_date: date, end_date: date) -> BillingData | None:
        ...
