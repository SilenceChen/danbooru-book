import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import Tag, Category, TagCategory
from schemas import TagOut, TagListOut, TagUpdate, TagCategoryOut

router = APIRouter(prefix="/tags", tags=["tags"])


def _serialize_tag(tag: Tag) -> TagOut:
    cats = []
    for tc in tag.tag_categories:
        cats.append(TagCategoryOut(
            category_id=tc.category_id,
            category_name=tc.category.name,
            is_primary=tc.is_primary,
            source=tc.source,
        ))
    return TagOut(
        id=tag.id,
        name=tag.name,
        name_zh=tag.name_zh,
        description_zh=tag.description_zh,
        danbooru_category=tag.danbooru_category,
        post_count=tag.post_count,
        representative_image_url=tag.representative_image_url,
        translated_at=tag.translated_at,
        categories=cats,
    )


@router.get("", response_model=TagListOut)
async def list_tags(
    q: str = Query("", description="按英文或中文名模糊搜索"),
    category_id: int | None = Query(None, description="按分类 ID 筛选"),
    untranslated: bool = Query(False, description="只看未翻译"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Tag).options(
        selectinload(Tag.tag_categories).selectinload(TagCategory.category)
    )

    if q:
        stmt = stmt.where(or_(Tag.name.ilike(f"%{q}%"), Tag.name_zh.ilike(f"%{q}%")))

    if category_id is not None:
        stmt = stmt.join(TagCategory, Tag.id == TagCategory.tag_id).where(
            TagCategory.category_id == category_id
        )

    if untranslated:
        stmt = stmt.where(Tag.translated_at.is_(None))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(Tag.post_count.desc()).offset((page - 1) * limit).limit(limit)
    tags = (await db.execute(stmt)).scalars().unique().all()

    return TagListOut(
        total=total,
        page=page,
        limit=limit,
        items=[_serialize_tag(t) for t in tags],
    )


async def _get_tag_with_cats(db: AsyncSession, tag_id: int) -> Tag | None:
    stmt = select(Tag).where(Tag.id == tag_id).options(
        selectinload(Tag.tag_categories).selectinload(TagCategory.category)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


@router.get("/{tag_id}", response_model=TagOut)
async def get_tag(tag_id: int, db: AsyncSession = Depends(get_db)):
    tag = await _get_tag_with_cats(db, tag_id)
    if not tag:
        raise HTTPException(404, "Tag 不存在")
    return _serialize_tag(tag)


@router.patch("/{tag_id}", response_model=TagOut)
async def update_tag(tag_id: int, body: TagUpdate, db: AsyncSession = Depends(get_db)):
    tag = await db.get(Tag, tag_id)
    if not tag:
        raise HTTPException(404, "Tag 不存在")

    if body.name_zh is not None:
        tag.name_zh = body.name_zh
    if body.description_zh is not None:
        tag.description_zh = body.description_zh

    # 手动设置分类（source=manual，优先级最高）
    if body.category_ids is not None:
        # 移除所有旧 manual 分类
        tag.tag_categories = [tc for tc in tag.tag_categories if tc.source != "manual"]
        for cat_id in body.category_ids:
            cat = await db.get(Category, cat_id)
            if not cat:
                continue
            existing_ids = {tc.category_id for tc in tag.tag_categories}
            if cat_id in existing_ids:
                # 升级 source 为 manual
                for tc in tag.tag_categories:
                    if tc.category_id == cat_id:
                        tc.source = "manual"
                        tc.is_primary = (cat_id == body.primary_category_id)
                continue
            tag.tag_categories.append(TagCategory(
                category_id=cat_id,
                is_primary=(cat_id == body.primary_category_id),
                source="manual",
            ))

    await db.commit()
    tag = await _get_tag_with_cats(db, tag_id)
    return _serialize_tag(tag)
