from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user, require_admin
from app.models.user import User
from app.models.project import Project
from app.models.platform_key import PlatformKey
from app.models.sync_log import SyncLog

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.post("/trigger")
async def trigger_sync_all(admin: User = Depends(require_admin)):
    from app.services.sync_service import sync_all_active_keys
    count = await sync_all_active_keys(tenant_id=admin.tenant_id)
    return {"detail": f"Sync triggered for {count} keys"}


@router.post("/trigger/{key_id}")
async def trigger_sync_key(key_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlatformKey).join(Project).where(PlatformKey.id == key_id, Project.tenant_id == admin.tenant_id)
    )
    pk = result.scalar_one_or_none()
    if not pk:
        raise HTTPException(status_code=404, detail="Key not found")
    from app.services.sync_service import sync_single_key
    await sync_single_key(key_id)
    return {"detail": "Sync triggered"}


@router.get("/status")
async def sync_status(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SyncLog)
        .join(PlatformKey)
        .join(Project)
        .where(Project.tenant_id == user.tenant_id)
        .order_by(SyncLog.started_at.desc())
        .limit(20)
    )
    logs = result.scalars().all()
    return [
        {
            "id": str(log.id),
            "platform_key_id": str(log.platform_key_id),
            "sync_type": log.sync_type,
            "status": log.status,
            "records_synced": log.records_synced,
            "started_at": log.started_at.isoformat() if log.started_at else None,
            "completed_at": log.completed_at.isoformat() if log.completed_at else None,
            "error_message": log.error_message,
        }
        for log in logs
    ]
