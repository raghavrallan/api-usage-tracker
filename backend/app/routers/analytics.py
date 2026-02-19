import csv
import io
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.department import Department
from app.models.platform_key import PlatformKey
from app.models.usage_record import UsageRecord
from app.models.user_project_access import UserProjectAccess
from app.schemas.analytics import ProjectDetail, KeyDetail, DepartmentDetail, UserRankingItem

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/project/{project_id}", response_model=ProjectDetail)
async def project_detail(project_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    proj = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if not proj:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Project not found")

    agg = await db.execute(
        select(
            func.coalesce(func.sum(UsageRecord.total_tokens), 0),
            func.coalesce(func.sum(UsageRecord.cost_usd), 0),
            func.coalesce(func.sum(UsageRecord.request_count), 0),
        )
        .join(PlatformKey)
        .where(PlatformKey.project_id == project_id)
    )
    row = agg.one()

    keys_count = (await db.execute(
        select(func.count()).select_from(PlatformKey).where(PlatformKey.project_id == project_id)
    )).scalar()

    daily = await db.execute(
        select(UsageRecord.recorded_at, func.sum(UsageRecord.total_tokens), func.sum(UsageRecord.cost_usd), func.sum(UsageRecord.request_count))
        .join(PlatformKey).where(PlatformKey.project_id == project_id)
        .group_by(UsageRecord.recorded_at).order_by(UsageRecord.recorded_at)
    )
    daily_usage = [{"date": str(r[0]), "tokens": int(r[1]), "cost": float(r[2]), "requests": int(r[3])} for r in daily.all()]

    models = await db.execute(
        select(UsageRecord.model, func.sum(UsageRecord.total_tokens), func.sum(UsageRecord.cost_usd), func.sum(UsageRecord.request_count))
        .join(PlatformKey).where(PlatformKey.project_id == project_id)
        .group_by(UsageRecord.model).order_by(func.sum(UsageRecord.total_tokens).desc())
    )
    model_breakdown = [{"model": r[0], "tokens": int(r[1]), "cost": float(r[2]), "requests": int(r[3])} for r in models.all()]

    return ProjectDetail(
        project_id=project_id, project_name=proj.name,
        total_tokens=int(row[0]), total_cost=float(row[1]), total_requests=int(row[2]),
        keys_count=keys_count, daily_usage=daily_usage, model_breakdown=model_breakdown,
    )


@router.get("/key/{key_id}", response_model=KeyDetail)
async def key_detail(key_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    pk = (await db.execute(select(PlatformKey).where(PlatformKey.id == key_id))).scalar_one_or_none()
    if not pk:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Key not found")

    agg = await db.execute(
        select(
            func.coalesce(func.sum(UsageRecord.total_tokens), 0),
            func.coalesce(func.sum(UsageRecord.cost_usd), 0),
            func.coalesce(func.sum(UsageRecord.request_count), 0),
        ).where(UsageRecord.platform_key_id == key_id)
    )
    row = agg.one()

    daily = await db.execute(
        select(UsageRecord.recorded_at, func.sum(UsageRecord.total_tokens), func.sum(UsageRecord.cost_usd), func.sum(UsageRecord.request_count))
        .where(UsageRecord.platform_key_id == key_id)
        .group_by(UsageRecord.recorded_at).order_by(UsageRecord.recorded_at)
    )
    daily_usage = [{"date": str(r[0]), "tokens": int(r[1]), "cost": float(r[2]), "requests": int(r[3])} for r in daily.all()]

    models = await db.execute(
        select(UsageRecord.model, func.sum(UsageRecord.total_tokens), func.sum(UsageRecord.cost_usd), func.sum(UsageRecord.request_count))
        .where(UsageRecord.platform_key_id == key_id)
        .group_by(UsageRecord.model).order_by(func.sum(UsageRecord.total_tokens).desc())
    )
    model_breakdown = [{"model": r[0], "tokens": int(r[1]), "cost": float(r[2]), "requests": int(r[3])} for r in models.all()]

    return KeyDetail(
        key_id=key_id, key_label=pk.key_label, platform=pk.platform,
        total_tokens=int(row[0]), total_cost=float(row[1]), total_requests=int(row[2]),
        daily_usage=daily_usage, model_breakdown=model_breakdown,
    )


@router.get("/department/{dept_id}", response_model=DepartmentDetail)
async def department_detail(dept_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    dept = (await db.execute(select(Department).where(Department.id == dept_id))).scalar_one_or_none()
    if not dept:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Department not found")

    projects_count = (await db.execute(
        select(func.count()).select_from(Project).where(Project.department_id == dept_id)
    )).scalar()

    agg = await db.execute(
        select(
            func.coalesce(func.sum(UsageRecord.total_tokens), 0),
            func.coalesce(func.sum(UsageRecord.cost_usd), 0),
        )
        .join(PlatformKey)
        .join(Project)
        .where(Project.department_id == dept_id)
    )
    row = agg.one()

    proj_breakdown = await db.execute(
        select(Project.id, Project.name, func.sum(UsageRecord.total_tokens), func.sum(UsageRecord.cost_usd))
        .join(PlatformKey, PlatformKey.project_id == Project.id)
        .join(UsageRecord, UsageRecord.platform_key_id == PlatformKey.id)
        .where(Project.department_id == dept_id)
        .group_by(Project.id, Project.name)
    )
    project_breakdown = [{"project_id": str(r[0]), "project_name": r[1], "tokens": int(r[2]), "cost": float(r[3])} for r in proj_breakdown.all()]

    return DepartmentDetail(
        department_id=dept_id, department_name=dept.name,
        projects_count=projects_count, total_tokens=int(row[0]), total_cost=float(row[1]),
        project_breakdown=project_breakdown,
    )


@router.get("/user-ranking", response_model=list[UserRankingItem])
async def user_ranking(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            User.id, User.full_name, User.email, Department.name,
            func.coalesce(func.sum(UsageRecord.total_tokens), 0),
            func.coalesce(func.sum(UsageRecord.cost_usd), 0),
            func.count(func.distinct(Project.id)),
        )
        .outerjoin(Department, Department.id == User.department_id)
        .join(UserProjectAccess, UserProjectAccess.user_id == User.id)
        .join(Project, Project.id == UserProjectAccess.project_id)
        .join(PlatformKey, PlatformKey.project_id == Project.id)
        .outerjoin(UsageRecord, UsageRecord.platform_key_id == PlatformKey.id)
        .where(User.tenant_id == user.tenant_id)
        .group_by(User.id, User.full_name, User.email, Department.name)
        .order_by(func.coalesce(func.sum(UsageRecord.total_tokens), 0).desc())
    )
    return [
        UserRankingItem(
            user_id=r[0], full_name=r[1], email=r[2], department_name=r[3],
            total_tokens=int(r[4]), total_cost=float(r[5]), projects_count=int(r[6]),
        )
        for r in result.all()
    ]


@router.get("/export")
async def export_csv(
    range: str = Query("30d"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    days = {"7d": 7, "30d": 30, "90d": 90}.get(range, 30)
    start = date.today() - timedelta(days=days)

    if user.role == "admin":
        key_filter = select(PlatformKey.id).join(Project).where(Project.tenant_id == user.tenant_id)
    else:
        key_filter = (
            select(PlatformKey.id).join(Project)
            .join(UserProjectAccess, UserProjectAccess.project_id == Project.id)
            .where(UserProjectAccess.user_id == user.id)
        )

    result = await db.execute(
        select(
            UsageRecord.recorded_at, UsageRecord.model,
            UsageRecord.input_tokens, UsageRecord.output_tokens, UsageRecord.total_tokens,
            UsageRecord.cost_usd, UsageRecord.request_count,
            PlatformKey.platform, PlatformKey.key_label,
            Project.name,
        )
        .join(PlatformKey, PlatformKey.id == UsageRecord.platform_key_id)
        .join(Project, Project.id == PlatformKey.project_id)
        .where(UsageRecord.platform_key_id.in_(key_filter), UsageRecord.recorded_at >= start)
        .order_by(UsageRecord.recorded_at)
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["date", "model", "input_tokens", "output_tokens", "total_tokens", "cost_usd", "requests", "platform", "key_label", "project"])
    for r in result.all():
        writer.writerow(list(r))

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=usage_export.csv"},
    )
