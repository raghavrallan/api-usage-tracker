from pydantic import BaseModel


class ProjectDetail(BaseModel):
    project_id: str
    project_name: str
    total_tokens: int
    total_cost: float
    total_requests: int
    keys_count: int
    daily_usage: list[dict]
    model_breakdown: list[dict]


class KeyDetail(BaseModel):
    key_id: str
    key_label: str
    platform: str
    total_tokens: int
    total_cost: float
    total_requests: int
    daily_usage: list[dict]
    model_breakdown: list[dict]


class DepartmentDetail(BaseModel):
    department_id: str
    department_name: str
    projects_count: int
    total_tokens: int
    total_cost: float
    project_breakdown: list[dict]


class UserRankingItem(BaseModel):
    user_id: str
    full_name: str
    email: str
    department_name: str | None
    total_tokens: int
    total_cost: float
    projects_count: int


class SyncLogOut(BaseModel):
    id: str
    platform_key_id: str
    sync_type: str
    status: str
    error_message: str | None
    records_synced: int
    started_at: str
    completed_at: str | None
    model_config = {"from_attributes": True}
