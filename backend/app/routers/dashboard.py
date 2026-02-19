from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.platform_key import PlatformKey
from app.models.usage_record import UsageRecord
from app.models.user_project_access import UserProjectAccess
from app.schemas.dashboard import (
    KPIOverview, UsageTrendPoint, CostBreakdownItem,
    ModelDistributionItem, TopProjectItem, BillingSummaryRow,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _accessible_keys_query(user: User):
    """Return a subquery of platform_key IDs accessible to the user."""
    if user.role == "admin":
        return select(PlatformKey.id).join(Project).where(Project.tenant_id == user.tenant_id)
    return (
        select(PlatformKey.id)
        .join(Project)
        .join(UserProjectAccess, UserProjectAccess.project_id == Project.id)
        .where(UserProjectAccess.user_id == user.id)
    )


def _date_range(range_str: str) -> date:
    days = {"7d": 7, "30d": 30, "90d": 90}.get(range_str, 30)
    return date.today() - timedelta(days=days)


@router.get("/overview", response_model=KPIOverview)
async def overview(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    key_ids = _accessible_keys_query(user)

    tokens_q = await db.execute(
        select(
            func.coalesce(func.sum(UsageRecord.total_tokens), 0),
            func.coalesce(func.sum(UsageRecord.cost_usd), 0),
            func.coalesce(func.sum(UsageRecord.request_count), 0),
        ).where(UsageRecord.platform_key_id.in_(key_ids))
    )
    row = tokens_q.one()

    active_keys = await db.execute(
        select(func.count()).select_from(PlatformKey).where(PlatformKey.id.in_(key_ids), PlatformKey.is_active == True)
    )
    active_projects = await db.execute(
        select(func.count(func.distinct(PlatformKey.project_id))).where(PlatformKey.id.in_(key_ids))
    )

    return KPIOverview(
        total_tokens=int(row[0]),
        total_cost=float(row[1]),
        active_keys=active_keys.scalar(),
        active_projects=active_projects.scalar(),
        total_requests=int(row[2]),
    )


@router.get("/usage-trends", response_model=list[UsageTrendPoint])
async def usage_trends(
    range: str = Query("30d"),
    platform: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    key_ids = _accessible_keys_query(user)
    start = _date_range(range)

    q = (
        select(
            UsageRecord.recorded_at,
            func.sum(UsageRecord.total_tokens),
            func.sum(UsageRecord.cost_usd),
            func.sum(UsageRecord.request_count),
        )
        .where(UsageRecord.platform_key_id.in_(key_ids), UsageRecord.recorded_at >= start)
        .group_by(UsageRecord.recorded_at)
        .order_by(UsageRecord.recorded_at)
    )
    if platform:
        q = q.join(PlatformKey).where(PlatformKey.platform == platform)

    result = await db.execute(q)
    return [
        UsageTrendPoint(date=r[0], tokens=int(r[1]), cost=float(r[2]), requests=int(r[3]))
        for r in result.all()
    ]


@router.get("/cost-breakdown", response_model=list[CostBreakdownItem])
async def cost_breakdown(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    key_ids = _accessible_keys_query(user)
    result = await db.execute(
        select(PlatformKey.platform, func.sum(UsageRecord.cost_usd))
        .join(PlatformKey, UsageRecord.platform_key_id == PlatformKey.id)
        .where(UsageRecord.platform_key_id.in_(key_ids))
        .group_by(PlatformKey.platform)
    )
    rows = result.all()
    total = sum(float(r[1]) for r in rows) or 1
    return [
        CostBreakdownItem(platform=r[0], cost=float(r[1]), percentage=round(float(r[1]) / total * 100, 1))
        for r in rows
    ]


@router.get("/model-distribution", response_model=list[ModelDistributionItem])
async def model_distribution(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    key_ids = _accessible_keys_query(user)
    result = await db.execute(
        select(
            UsageRecord.model,
            func.sum(UsageRecord.total_tokens),
            func.sum(UsageRecord.cost_usd),
            func.sum(UsageRecord.request_count),
        )
        .where(UsageRecord.platform_key_id.in_(key_ids))
        .group_by(UsageRecord.model)
        .order_by(func.sum(UsageRecord.total_tokens).desc())
        .limit(15)
    )
    return [
        ModelDistributionItem(model=r[0], tokens=int(r[1]), cost=float(r[2]), requests=int(r[3]))
        for r in result.all()
    ]


@router.get("/top-projects", response_model=list[TopProjectItem])
async def top_projects(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    key_ids = _accessible_keys_query(user)
    result = await db.execute(
        select(
            Project.id,
            Project.name,
            func.sum(UsageRecord.cost_usd),
            func.sum(UsageRecord.total_tokens),
        )
        .join(PlatformKey, PlatformKey.project_id == Project.id)
        .join(UsageRecord, UsageRecord.platform_key_id == PlatformKey.id)
        .where(PlatformKey.id.in_(key_ids))
        .group_by(Project.id, Project.name)
        .order_by(func.sum(UsageRecord.cost_usd).desc())
        .limit(5)
    )
    return [
        TopProjectItem(project_id=r[0], project_name=r[1], total_cost=float(r[2]), total_tokens=int(r[3]))
        for r in result.all()
    ]


@router.get("/billing-summary", response_model=list[BillingSummaryRow])
async def billing_summary(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    key_ids = _accessible_keys_query(user)
    start = date.today() - timedelta(days=30)
    result = await db.execute(
        select(
            Project.id,
            Project.name,
            PlatformKey.platform,
            PlatformKey.key_label,
            func.sum(UsageRecord.cost_usd),
            func.sum(UsageRecord.total_tokens),
        )
        .join(PlatformKey, PlatformKey.project_id == Project.id)
        .join(UsageRecord, UsageRecord.platform_key_id == PlatformKey.id)
        .where(PlatformKey.id.in_(key_ids), UsageRecord.recorded_at >= start)
        .group_by(Project.id, Project.name, PlatformKey.platform, PlatformKey.key_label)
        .order_by(func.sum(UsageRecord.cost_usd).desc())
    )
    return [
        BillingSummaryRow(project_id=r[0], project_name=r[1], platform=r[2], key_label=r[3], cost=float(r[4]), tokens=int(r[5]))
        for r in result.all()
    ]
