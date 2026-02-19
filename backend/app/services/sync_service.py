import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.platform_key import PlatformKey
from app.models.project import Project
from app.models.usage_record import UsageRecord
from app.models.billing_snapshot import BillingSnapshot
from app.models.sync_log import SyncLog
from app.services.encryption_service import decrypt_api_key
from app.services.providers.openai_provider import OpenAIProvider
from app.services.providers.anthropic_provider import AnthropicProvider
from app.services.providers.google_provider import GoogleProvider


PROVIDERS = {
    "openai": OpenAIProvider(),
    "anthropic": AnthropicProvider(),
    "google": GoogleProvider(),
}


async def sync_single_key(key_id: str, sync_type: str = "manual") -> int:
    async with async_session() as db:
        pk = (await db.execute(select(PlatformKey).where(PlatformKey.id == key_id))).scalar_one_or_none()
        if not pk or not pk.is_active:
            return 0

        log = SyncLog(platform_key_id=key_id, sync_type=sync_type, status="running")
        db.add(log)
        await db.flush()

        try:
            provider = PROVIDERS.get(pk.platform)
            if not provider:
                raise ValueError(f"Unknown platform: {pk.platform}")

            api_key = decrypt_api_key(pk.api_key_encrypted)
            end_date = date.today()
            start_date = end_date - timedelta(days=30)

            usage_data = await provider.fetch_usage(api_key, start_date, end_date)
            count = 0
            for ud in usage_data:
                existing = await db.execute(
                    select(UsageRecord).where(
                        UsageRecord.platform_key_id == key_id,
                        UsageRecord.recorded_at == ud.recorded_at,
                        UsageRecord.model == ud.model,
                    )
                )
                if existing.scalar_one_or_none():
                    continue
                db.add(UsageRecord(
                    platform_key_id=key_id,
                    recorded_at=ud.recorded_at,
                    model=ud.model,
                    input_tokens=ud.input_tokens,
                    output_tokens=ud.output_tokens,
                    total_tokens=ud.total_tokens,
                    cost_usd=ud.cost_usd,
                    request_count=ud.request_count,
                    metadata_extra=ud.metadata_extra,
                ))
                count += 1

            billing = await provider.fetch_billing(api_key, start_date, end_date)
            if billing:
                db.add(BillingSnapshot(
                    platform_key_id=key_id,
                    period_start=billing.period_start,
                    period_end=billing.period_end,
                    total_cost_usd=billing.total_cost_usd,
                    total_tokens=billing.total_tokens,
                    breakdown=billing.breakdown,
                ))

            pk.last_synced_at = datetime.now(timezone.utc)
            log.status = "success"
            log.records_synced = count
            log.completed_at = datetime.now(timezone.utc)
            await db.commit()
            return count

        except Exception as e:
            log.status = "failed"
            log.error_message = str(e)[:500]
            log.completed_at = datetime.now(timezone.utc)
            await db.commit()
            return 0


async def sync_all_active_keys(tenant_id: str | None = None) -> int:
    async with async_session() as db:
        q = select(PlatformKey.id).join(Project).where(PlatformKey.is_active == True)
        if tenant_id:
            q = q.where(Project.tenant_id == tenant_id)
        result = await db.execute(q)
        key_ids = [r[0] for r in result.all()]

    count = 0
    for kid in key_ids:
        await sync_single_key(kid, sync_type="auto")
        count += 1
    return count
