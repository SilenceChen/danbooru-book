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
SEED_TAGS = [
    # 画面基础
    ("1girl", 7564075, 0), ("solo", 6323242, 0), ("2girls", 2100000, 0),
    ("1boy", 1800000, 0), ("multiple girls", 900000, 0), ("no humans", 600000, 0),
    ("3girls", 500000, 0), ("1other", 300000, 0), ("couple", 200000, 0),

    # 强化属性
    ("highres", 7139672, 5), ("masterpiece", 1200000, 0), ("best quality", 900000, 0),
    ("absurdres", 800000, 5), ("ultra-detailed", 600000, 0), ("8k", 300000, 0),
    ("4k", 400000, 0), ("high quality", 500000, 0), ("detailed", 700000, 0),

    # 反向关键词
    ("lowres", 1500000, 5), ("bad anatomy", 800000, 5), ("bad hands", 700000, 5),
    ("watermark", 600000, 5), ("blurry", 500000, 5), ("text", 400000, 5),
    ("signature", 350000, 5), ("worst quality", 300000, 5), ("low quality", 280000, 5),
    ("jpeg artifacts", 250000, 5), ("extra limbs", 200000, 5), ("deformed", 180000, 5),

    # 头发颜色
    ("blonde hair", 1500000, 0), ("brown hair", 1400000, 0), ("black hair", 1300000, 0),
    ("white hair", 800000, 0), ("red hair", 700000, 0), ("blue hair", 600000, 0),
    ("pink hair", 550000, 0), ("silver hair", 500000, 0), ("purple hair", 450000, 0),
    ("green hair", 400000, 0), ("gray hair", 350000, 0), ("orange hair", 300000, 0),
    ("multicolored hair", 600000, 0), ("gradient hair", 400000, 0),

    # 发型
    ("long hair", 4500000, 0), ("short hair", 2000000, 0), ("medium hair", 1200000, 0),
    ("twintails", 1000000, 0), ("ponytail", 900000, 0), ("braid", 700000, 0),
    ("side ponytail", 300000, 0), ("ahoge", 600000, 0), ("bangs", 1000000, 0),
    ("hair bun", 400000, 0), ("drill hair", 200000, 0),

    # 眼睛
    ("blue eyes", 2800000, 0), ("red eyes", 1800000, 0), ("green eyes", 1200000, 0),
    ("brown eyes", 900000, 0), ("purple eyes", 700000, 0), ("yellow eyes", 600000, 0),
    ("pink eyes", 300000, 0), ("heterochromia", 400000, 0), ("closed eyes", 800000, 0),
    ("glowing eyes", 300000, 0), ("aqua eyes", 500000, 0),

    # 表情/脸
    ("smile", 3000000, 0), ("blush", 2000000, 0), ("open mouth", 2500000, 0),
    ("closed mouth", 1000000, 0), ("frown", 300000, 0), ("tears", 400000, 0),
    ("tongue out", 300000, 0), ("ahegao", 200000, 0), ("expressionless", 400000, 0),

    # 衣服
    ("school uniform", 1800000, 0), ("dress", 1500000, 0), ("white shirt", 800000, 0),
    ("jacket", 700000, 0), ("coat", 600000, 0), ("sweater", 500000, 0),
    ("maid outfit", 400000, 0), ("swimsuit", 600000, 0), ("bikini", 500000, 0),
    ("t-shirt", 400000, 0), ("hoodie", 350000, 0), ("sailor uniform", 400000, 0),
    ("kimono", 350000, 0), ("shirt", 1200000, 0),

    # 裙子
    ("skirt", 2500000, 0), ("miniskirt", 800000, 0), ("pleated skirt", 600000, 0),
    ("white skirt", 300000, 0), ("black skirt", 400000, 0),

    # 袜子
    ("thighhighs", 1800000, 0), ("white thighhighs", 400000, 0),
    ("black thighhighs", 500000, 0), ("socks", 700000, 0), ("pantyhose", 400000, 0),

    # 鞋子
    ("boots", 600000, 0), ("sneakers", 300000, 0), ("high heels", 400000, 0),
    ("loafers", 200000, 0),

    # 配饰
    ("glasses", 600000, 0), ("hat", 700000, 0), ("ribbon", 800000, 0),
    ("bow", 700000, 0), ("necklace", 300000, 0), ("earrings", 400000, 0),
    ("cat ears", 500000, 0), ("hair ribbon", 600000, 0), ("hairpin", 400000, 0),

    # 身体
    ("large breasts", 2000000, 0), ("small breasts", 600000, 0),
    ("flat chest", 500000, 0), ("medium breasts", 700000, 0),
    ("bare shoulders", 600000, 0), ("navel", 800000, 0), ("cleavage", 700000, 0),

    # 姿势
    ("sitting", 1200000, 0), ("standing", 1000000, 0), ("lying", 600000, 0),
    ("kneeling", 300000, 0), ("running", 200000, 0), ("jumping", 250000, 0),
    ("looking at viewer", 4000000, 0), ("looking back", 500000, 0),
    ("from above", 400000, 0), ("from below", 300000, 0), ("from side", 350000, 0),

    # 背景
    ("simple background", 3000000, 0), ("white background", 2000000, 0),
    ("outdoors", 1500000, 0), ("indoors", 600000, 0), ("sky", 800000, 0),
    ("night", 600000, 0), ("cityscape", 300000, 0), ("forest", 300000, 0),
    ("school", 400000, 0), ("bedroom", 300000, 0), ("ocean", 250000, 0),

    # 画面效果
    ("bokeh", 400000, 0), ("depth of field", 600000, 0), ("light rays", 300000, 0),
    ("glowing", 400000, 0), ("sparkle", 300000, 0), ("shadow", 500000, 0),

    # 镜头
    ("close-up", 800000, 0), ("upper body", 1200000, 0), ("full body", 1000000, 0),
    ("portrait", 600000, 0), ("cowboy shot", 700000, 0), ("face", 500000, 0),

    # 风格
    ("anime", 600000, 0), ("realistic", 300000, 0), ("3d", 400000, 0),
    ("sketch", 300000, 0), ("watercolor", 200000, 0), ("oil painting", 150000, 0),
    ("pixel art", 250000, 0), ("cel shading", 150000, 0),

    # 知名画师
    ("by greg rutkowski", 100000, 1), ("by artgerm", 80000, 1),
    ("by wlop", 60000, 1), ("by ilya kuvshinov", 50000, 1),

    # 食物
    ("food", 300000, 0), ("cake", 150000, 0), ("ice cream", 120000, 0),
    ("coffee", 100000, 0), ("fruit", 130000, 0),
]


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
