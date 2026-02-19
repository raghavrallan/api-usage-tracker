from pydantic import BaseModel
from datetime import datetime


# --- Department ---
class DepartmentCreate(BaseModel):
    name: str
    description: str | None = None

class DepartmentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None

class DepartmentOut(BaseModel):
    id: str
    tenant_id: str
    name: str
    description: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


# --- User ---
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "user"
    department_id: str | None = None

class UserUpdate(BaseModel):
    email: str | None = None
    full_name: str | None = None
    role: str | None = None
    department_id: str | None = None
    is_active: bool | None = None

class UserOut(BaseModel):
    id: str
    tenant_id: str
    department_id: str | None
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# --- Project ---
class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    department_id: str | None = None

class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    department_id: str | None = None

class ProjectOut(BaseModel):
    id: str
    tenant_id: str
    department_id: str | None
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# --- Platform Key ---
class PlatformKeyCreate(BaseModel):
    platform: str
    api_key: str
    key_label: str

class PlatformKeyOut(BaseModel):
    id: str
    project_id: str
    platform: str
    key_label: str
    is_active: bool
    last_synced_at: datetime | None
    created_at: datetime
    model_config = {"from_attributes": True}


# --- User Project Access ---
class UserAccessUpdate(BaseModel):
    project_ids: list[str]
    permission_level: str = "view"

class UserAccessOut(BaseModel):
    project_id: str
    permission_level: str
    model_config = {"from_attributes": True}


# --- Sync Settings ---
class SyncIntervalUpdate(BaseModel):
    interval_hours: int
