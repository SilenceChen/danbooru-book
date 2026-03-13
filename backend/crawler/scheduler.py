import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from config import settings
from database import AsyncSessionLocal

logger = logging.getLogger(__name__)
_scheduler = AsyncIOScheduler()


async def _daily_crawl():
    from crawler.danbooru import crawl_incremental
    from routers.tasks import task_status

    logger.info("定时增量爬取开始")
    async with AsyncSessionLocal() as db:
        await crawl_incremental(db, task_status["crawl"])
    logger.info("定时增量爬取完成")


def start_scheduler():
    _scheduler.add_job(
        _daily_crawl,
        trigger="interval",
        hours=settings.crawl_interval_hours,
        id="daily_crawl",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(f"定时爬取已启动，间隔 {settings.crawl_interval_hours} 小时")


def stop_scheduler():
    _scheduler.shutdown()
