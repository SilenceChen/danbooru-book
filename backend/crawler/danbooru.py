"""
Danbooru API 爬虫。

API 文档: https://danbooru.donmai.us/wiki_pages/api:index
Tag 分类: 0=General, 1=Artist, 3=Copyright, 4=Character, 5=Meta

使用 curl-cffi 模拟 Chrome TLS 指纹，绕过 Cloudflare 保护。
"""
import asyncio
import logging
from datetime import datetime

from curl_cffi.requests import AsyncSession
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession as DBSession

from config import settings
from models import Tag, Category, TagCategory
from services.classifier import rule_classify

logger = logging.getLogger(__name__)

BASE_URL = "https://danbooru.donmai.us"


def _auth_params() -> dict:
    if settings.danbooru_username and settings.danbooru_api_key:
        return {"login": settings.danbooru_username, "api_key": settings.danbooru_api_key}
    return {}


async def fetch_tags_page(session: AsyncSession, page: int, limit: int = 1000) -> list[dict]:
    """获取一页 tag 列表（按 post_count 降序）"""
    resp = await session.get(
        f"{BASE_URL}/tags.json",
        params={"page": page, "limit": limit, "search[order]": "count", **_auth_params()},
        timeout=60,
        impersonate="chrome136",
    )
    resp.raise_for_status()
    return resp.json()


async def fetch_representative_image(session: AsyncSession, tag_name: str) -> str | None:
    """获取该 tag 的代表性图片 URL"""
    try:
        resp = await session.get(
            f"{BASE_URL}/posts.json",
            params={"tags": tag_name, "limit": 1, "only": "id,file_url,sample_url,preview_url", **_auth_params()},
            timeout=15,
            impersonate="chrome136",
        )
        resp.raise_for_status()
        posts = resp.json()
        if posts:
            post = posts[0]
            return post.get("sample_url") or post.get("preview_url") or post.get("file_url")
    except Exception as e:
        logger.debug(f"获取图片失败 ({tag_name}): {e}")
    return None


async def upsert_tag(
    db: DBSession,
    raw: dict,
    categories_map: dict[str, int],
    fetch_image: bool = False,
    session: AsyncSession | None = None,
):
    """将一条 Danbooru tag 数据写入数据库（新增或更新）"""
    name = raw.get("name", "").strip()
    if not name:
        return

    stmt = select(Tag).where(Tag.name == name)
    tag = (await db.execute(stmt)).scalar_one_or_none()

    now = datetime.utcnow()
    if tag is None:
        tag = Tag(name=name, crawled_at=now)
        db.add(tag)

    tag.post_count = raw.get("post_count", 0)
    tag.danbooru_category = raw.get("category")
    tag.updated_at = now

    # 规则分类（仅在没有 manual 分类时写入）
    has_manual = any(tc.source == "manual" for tc in tag.tag_categories)
    if not has_manual:
        tag.tag_categories = [tc for tc in tag.tag_categories if tc.source != "rule"]
        cats, primary = rule_classify(name)
        for cat_name in cats:
            cat_id = categories_map.get(cat_name)
            if not cat_id:
                continue
            existing_ids = {tc.category_id for tc in tag.tag_categories}
            if cat_id in existing_ids:
                continue
            tag.tag_categories.append(TagCategory(
                category_id=cat_id,
                is_primary=(cat_name == primary),
                source="rule",
            ))

    # 获取代表图片（仅在首次爬取且没有图片时）
    if fetch_image and not tag.representative_image_url and session:
        tag.representative_image_url = await fetch_representative_image(session, name)
        await asyncio.sleep(settings.crawl_request_interval)


async def crawl_all_tags(db: DBSession, task_status: dict):
    """全量爬取 Danbooru tags（按 post_count 从高到低）"""
    cats = (await db.execute(select(Category))).scalars().all()
    categories_map = {c.name: c.id for c in cats}

    task_status.update({"status": "running", "progress": 0, "total": 0, "message": "开始全量爬取..."})

    async with AsyncSession() as session:
        page = 1
        total = 0
        while True:
            try:
                tags = await fetch_tags_page(session, page, settings.crawl_batch_size)
            except Exception as e:
                logger.error(f"爬取第 {page} 页失败: {e}")
                break

            if not tags:
                break

            for raw in tags:
                await upsert_tag(db, raw, categories_map, fetch_image=False)

            await db.commit()
            total += len(tags)
            task_status.update({"progress": total, "message": f"已爬取 {total} 个 tag（第 {page} 页）"})
            logger.info(f"爬取进度: {total} tags (page {page})")

            if len(tags) < settings.crawl_batch_size:
                break

            page += 1
            await asyncio.sleep(settings.crawl_request_interval)

    task_status.update({"status": "done", "total": total, "message": f"全量爬取完成，共 {total} 个 tag"})


async def crawl_incremental(db: DBSession, task_status: dict):
    """增量爬取：只爬取前几页高频 tag（适合每日定时更新）"""
    cats = (await db.execute(select(Category))).scalars().all()
    categories_map = {c.name: c.id for c in cats}

    task_status.update({"status": "running", "progress": 0, "message": "开始增量爬取..."})

    async with AsyncSession() as session:
        total = 0
        for page in range(1, 6):  # 前 5 页约 5000 个高频 tag
            try:
                tags = await fetch_tags_page(session, page, settings.crawl_batch_size)
            except Exception as e:
                logger.error(f"增量爬取第 {page} 页失败: {e}")
                break

            for raw in tags:
                await upsert_tag(db, raw, categories_map, fetch_image=False)

            await db.commit()
            total += len(tags)
            logger.info(f"增量爬取第 {page} 页完成，累计 {total}")
            await asyncio.sleep(settings.crawl_request_interval)

    task_status.update({"status": "done", "progress": total, "message": f"增量爬取完成，更新 {total} 个 tag"})
