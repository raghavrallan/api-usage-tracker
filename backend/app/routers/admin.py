from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import require_admin
from app.models.user import User
from app.models.department import Department
from app.models.project import Project
from app.models.platform_key import PlatformKey
from app.models.user_project_access import UserProjectAccess
from app.models.sync_log import SyncLog
from app.schemas.admin import (
    DepartmentCreate, DepartmentUpdate, DepartmentOut,
    UserCreate, UserUpdate, UserOut,
    ProjectCreate, ProjectUpdate, ProjectOut,
    PlatformKeyCreate, PlatformKeyOut,
    UserAccessUpdate, UserAccessOut,
    SyncIntervalUpdate,
)
from app.services.auth_service import hash_password
from app.services.encryption_service import encrypt_api_key

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ───── Departments ─────

@router.get("/departments", response_model=list[DepartmentOut])
async def list_departments(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Department).where(Department.tenant_id == admin.tenant_id))
    return result.scalars().all()


@router.post("/departments", response_model=DepartmentOut, status_code=201)
async def create_department(body: DepartmentCreate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    dept = Department(tenant_id=admin.tenant_id, name=body.name, description=body.description)
    db.add(dept)
    await db.flush()
    await db.refresh(dept)
    return dept


@router.get("/departments/{dept_id}", response_model=DepartmentOut)
async def get_department(dept_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Department).where(Department.id == dept_id, Department.tenant_id == admin.tenant_id))
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return dept


@router.put("/departments/{dept_id}", response_model=DepartmentOut)
async def update_department(dept_id: str, body: DepartmentUpdate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Department).where(Department.id == dept_id, Department.tenant_id == admin.tenant_id))
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(dept, field, value)
    await db.flush()
    await db.refresh(dept)
    return dept


@router.delete("/departments/{dept_id}", status_code=204)
async def delete_department(dept_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Department).where(Department.id == dept_id, Department.tenant_id == admin.tenant_id))
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    await db.delete(dept)


# ───── Users ─────

@router.get("/users", response_model=list[UserOut])
async def list_users(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.tenant_id == admin.tenant_id))
    return result.scalars().all()


@router.post("/users", response_model=UserOut, status_code=201)
async def create_user(body: UserCreate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        tenant_id=admin.tenant_id,
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        role=body.role,
        department_id=body.department_id,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.get("/users/{user_id}", response_model=UserOut)
async def get_user(user_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id, User.tenant_id == admin.tenant_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/users/{user_id}", response_model=UserOut)
async def update_user(user_id: str, body: UserUpdate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id, User.tenant_id == admin.tenant_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.flush()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(user_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id, User.tenant_id == admin.tenant_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)


# ───── Projects ─────

@router.get("/projects", response_model=list[ProjectOut])
async def list_projects(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.tenant_id == admin.tenant_id))
    return result.scalars().all()


@router.post("/projects", response_model=ProjectOut, status_code=201)
async def create_project(body: ProjectCreate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    project = Project(tenant_id=admin.tenant_id, name=body.name, description=body.description, department_id=body.department_id)
    db.add(project)
    await db.flush()
    await db.refresh(project)
    return project


@router.get("/projects/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.tenant_id == admin.tenant_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/projects/{project_id}", response_model=ProjectOut)
async def update_project(project_id: str, body: ProjectUpdate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.tenant_id == admin.tenant_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    await db.flush()
    await db.refresh(project)
    return project


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(project_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.tenant_id == admin.tenant_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)


# ───── Platform Keys ─────

@router.get("/projects/{project_id}/keys", response_model=list[PlatformKeyOut])
async def list_keys(project_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlatformKey)
        .join(Project)
        .where(PlatformKey.project_id == project_id, Project.tenant_id == admin.tenant_id)
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/keys", response_model=PlatformKeyOut, status_code=201)
async def add_key(project_id: str, body: PlatformKeyCreate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.tenant_id == admin.tenant_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")
    if body.platform not in ("openai", "anthropic", "google"):
        raise HTTPException(status_code=400, detail="Platform must be openai, anthropic, or google")
    key = PlatformKey(
        project_id=project_id,
        platform=body.platform,
        api_key_encrypted=encrypt_api_key(body.api_key),
        key_label=body.key_label,
    )
    db.add(key)
    await db.flush()
    await db.refresh(key)
    return key


@router.delete("/projects/{project_id}/keys/{key_id}", status_code=204)
async def delete_key(project_id: str, key_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlatformKey)
        .join(Project)
        .where(PlatformKey.id == key_id, PlatformKey.project_id == project_id, Project.tenant_id == admin.tenant_id)
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    await db.delete(key)


# ───── User Access ─────

@router.get("/users/{user_id}/access", response_model=list[UserAccessOut])
async def get_user_access(user_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProjectAccess).where(UserProjectAccess.user_id == user_id))
    return result.scalars().all()


@router.put("/users/{user_id}/access")
async def update_user_access(user_id: str, body: UserAccessUpdate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(UserProjectAccess).where(UserProjectAccess.user_id == user_id))
    for pid in body.project_ids:
        db.add(UserProjectAccess(user_id=user_id, project_id=str(pid), permission_level=body.permission_level))
    await db.flush()
    return {"detail": "Access updated"}


# ───── Sync Logs ─────

@router.get("/sync-logs")
async def list_sync_logs(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SyncLog)
        .join(PlatformKey)
        .join(Project)
        .where(Project.tenant_id == admin.tenant_id)
        .order_by(SyncLog.started_at.desc())
        .limit(100)
    )
    return result.scalars().all()


# ───── Sync Settings ─────

@router.put("/settings/sync-interval")
async def update_sync_interval(body: SyncIntervalUpdate, admin: User = Depends(require_admin)):
    from app.utils.scheduler import scheduler
    scheduler.reschedule_job("auto_sync", trigger="interval", hours=body.interval_hours)
    return {"detail": f"Sync interval updated to {body.interval_hours} hours"}
