"""
种子数据脚本：插入 200+ 常用 AI 绘图 tag，用于测试系统功能。
运行方式: uv run python seed_tags.py
"""
import asyncio
from datetime import datetime
from sqlalchemy import select
from database import init_db, AsyncSessionLocal
from models import Tag, Category, TagCategory
from services.classifier import rule_classify

# 常用 AI 绘图 tag，按类型分组
SEED_TAGS: list[tuple[str, int, int]] = []


async def seed():
    await init_db()

    async with AsyncSessionLocal() as db:
        # 加载分类映射
        cats = (await db.execute(select(Category))).scalars().all()
        categories_map = {c.name: c.id for c in cats}

        if not categories_map:
            print("错误：分类数据为空，请先启动一次 uvicorn（会自动初始化分类）")
            return

        inserted = 0
        updated = 0
        now = datetime.utcnow()

        for name, post_count, danbooru_cat in SEED_TAGS:
            stmt = select(Tag).where(Tag.name == name)
            tag = (await db.execute(stmt)).scalar_one_or_none()

            if tag is None:
                tag = Tag(name=name, crawled_at=now)
                db.add(tag)
                inserted += 1
            else:
                updated += 1

            tag.post_count = post_count
            tag.danbooru_category = danbooru_cat
            tag.updated_at = now

            # 规则分类
            has_manual = any(tc.source == "manual" for tc in tag.tag_categories)
            if not has_manual:
                tag.tag_categories = [tc for tc in tag.tag_categories if tc.source != "rule"]
                cat_names, primary = rule_classify(name)
                for cat_name in cat_names:
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

        await db.commit()
        print(f"完成！新增 {inserted} 个，更新 {updated} 个 tag")

        # 验证
        total = (await db.execute(select(Tag))).scalars().all()
        print(f"数据库当前共 {len(total)} 个 tag")


if __name__ == "__main__":
    asyncio.run(seed())
