from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Category
from schemas import CategoryOut

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    cats = (await db.execute(select(Category).order_by(Category.sort_order))).scalars().all()
    return [CategoryOut(id=c.id, name=c.name, sort_order=c.sort_order) for c in cats]
