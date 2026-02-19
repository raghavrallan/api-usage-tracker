from pydantic import BaseModel
from datetime import date


class KPIOverview(BaseModel):
    total_tokens: int
    total_cost: float
    active_keys: int
    active_projects: int
    total_requests: int


class UsageTrendPoint(BaseModel):
    date: date
    tokens: int
    cost: float
    requests: int


class CostBreakdownItem(BaseModel):
    platform: str
    cost: float
    percentage: float


class ModelDistributionItem(BaseModel):
    model: str
    tokens: int
    cost: float
    requests: int


class TopProjectItem(BaseModel):
    project_id: str
    project_name: str
    total_cost: float
    total_tokens: int


class BillingSummaryRow(BaseModel):
    project_id: str
    project_name: str
    platform: str
    key_label: str
    cost: float
    tokens: int
