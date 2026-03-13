import json
import logging
from datetime import datetime

from google import genai
from google.genai import types
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models import Tag, Category, TagCategory
from services.prompts import TRANSLATION_SYSTEM_PROMPT, TRANSLATION_USER_TEMPLATE

logger = logging.getLogger(__name__)

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


async def translate_batch(tag_names: list[str]) -> list[dict]:
    """调用 Gemini API 翻译一批 tag，返回翻译结果列表"""
    if not tag_names:
        return []

    client = _get_client()
    prompt = TRANSLATION_USER_TEMPLATE.format(
        tags_json=json.dumps(tag_names, ensure_ascii=False)
    )

    try:
        response = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=TRANSLATION_SYSTEM_PROMPT,
            ),
        )
        text = response.text.strip()

        # 清理可能的 markdown 代码块
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]

        results = json.loads(text.strip())
        return results

    except json.JSONDecodeError as e:
        logger.error(f"JSON 解析失败: {e}\n原始响应: {response.text[:500]}")
        return []
    except Exception as e:
        logger.error(f"Gemini API 调用失败: {e}")
        return []


async def apply_translation(db: AsyncSession, result: dict, categories_map: dict[str, int]):
    """将单条翻译结果写入数据库"""
    tag_name = result.get("name")
    if not tag_name:
        return

    stmt = select(Tag).where(Tag.name == tag_name)
    tag = (await db.execute(stmt)).scalar_one_or_none()
    if not tag:
        return

    tag.name_zh = result.get("name_zh")
    tag.description_zh = result.get("description_zh")
    tag.translated_at = datetime.utcnow()

    # 清除旧的 LLM 分类（保留 manual 和 rule）
    tag.tag_categories = [
        tc for tc in tag.tag_categories if tc.source in ("manual", "rule")
    ]

    primary_cat = result.get("primary_category", "")
    cat_names: list[str] = result.get("categories", [])
    if primary_cat and primary_cat not in cat_names:
        cat_names.insert(0, primary_cat)

    for cat_name in cat_names:
        cat_id = categories_map.get(cat_name)
        if not cat_id:
            continue
        # 避免与已有 manual/rule 分类重复
        existing_ids = {tc.category_id for tc in tag.tag_categories}
        if cat_id in existing_ids:
            continue
        tc = TagCategory(
            tag_id=tag.id,
            category_id=cat_id,
            is_primary=(cat_name == primary_cat),
            source="llm",
        )
        tag.tag_categories.append(tc)

    await db.flush()


async def run_translation(
    db: AsyncSession,
    task_status: dict,
    limit: int = 500,
):
    """批量翻译未翻译的 tag（按 post_count 优先）"""
    # 加载分类 id 映射
    cats = (await db.execute(select(Category))).scalars().all()
    categories_map = {c.name: c.id for c in cats}

    # 查找未翻译的 tag
    stmt = (
        select(Tag)
        .where(Tag.translated_at.is_(None))
        .order_by(Tag.post_count.desc())
        .limit(limit)
    )
    tags = (await db.execute(stmt)).scalars().all()
    total = len(tags)
    task_status.update({"status": "running", "total": total, "progress": 0})

    batch_size = settings.translate_batch_size
    for i in range(0, total, batch_size):
        batch = tags[i : i + batch_size]
        batch_names = [t.name for t in batch]

        results = await translate_batch(batch_names)
        for r in results:
            try:
                await apply_translation(db, r, categories_map)
            except Exception as e:
                logger.warning(f"写入翻译结果失败 ({r.get('name')}): {e}")

        await db.commit()
        task_status["progress"] = min(i + batch_size, total)
        logger.info(f"翻译进度: {task_status['progress']}/{total}")

    task_status.update({"status": "done", "progress": total, "message": f"完成翻译 {total} 个 tag"})
