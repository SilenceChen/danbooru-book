import asyncio
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db, AsyncSessionLocal
from schemas import TaskStatus

router = APIRouter(prefix="/tasks", tags=["tasks"])

# 简单内存状态（单用户工具，无需持久化）
task_status: dict[str, dict] = {
    "crawl": {"status": "idle", "progress": 0, "total": 0, "message": ""},
    "translate": {"status": "idle", "progress": 0, "total": 0, "message": ""},
}


async def _run_crawl(full: bool):
    from crawler.danbooru import crawl_all_tags, crawl_incremental
    async with AsyncSessionLocal() as db:
        if full:
            await crawl_all_tags(db, task_status["crawl"])
        else:
            await crawl_incremental(db, task_status["crawl"])


async def _run_translate(limit: int):
    from services.translator import run_translation
    async with AsyncSessionLocal() as db:
        await run_translation(db, task_status["translate"], limit=limit)


@router.post("/crawl")
async def trigger_crawl(full: bool = False, background_tasks: BackgroundTasks = None):
    """手动触发爬取。full=True 为全量，False 为增量（前 5 页）"""
    if task_status["crawl"]["status"] == "running":
        return {"message": "爬取任务正在运行中"}
    task_status["crawl"] = {"status": "pending", "progress": 0, "total": 0, "message": "等待启动..."}
    background_tasks.add_task(_run_crawl, full)
    return {"message": f"{'全量' if full else '增量'}爬取任务已启动"}


@router.post("/translate")
async def trigger_translate(limit: int = 500, background_tasks: BackgroundTasks = None):
    """手动触发批量翻译。limit 为本次最多翻译数量"""
    if task_status["translate"]["status"] == "running":
        return {"message": "翻译任务正在运行中"}
    task_status["translate"] = {"status": "pending", "progress": 0, "total": 0, "message": "等待启动..."}
    background_tasks.add_task(_run_translate, limit)
    return {"message": f"翻译任务已启动（最多 {limit} 个）"}


@router.get("/status", response_model=dict[str, TaskStatus])
async def get_status():
    return {
        "crawl": TaskStatus(**task_status["crawl"]),
        "translate": TaskStatus(**task_status["translate"]),
    }
