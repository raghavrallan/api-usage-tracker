from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import settings

scheduler = AsyncIOScheduler()


async def sync_all_keys_job():
    from app.services.sync_service import sync_all_active_keys
    await sync_all_active_keys()


def start_scheduler():
    scheduler.add_job(
        sync_all_keys_job,
        "interval",
        hours=settings.AUTO_SYNC_INTERVAL_HOURS,
        id="auto_sync",
        replace_existing=True,
    )
    scheduler.start()


def stop_scheduler():
    scheduler.shutdown(wait=False)
