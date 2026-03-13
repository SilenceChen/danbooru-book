import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Composition
from schemas import CompositionIn, CompositionOut

router = APIRouter(prefix="/compositions", tags=["compositions"])


@router.get("", response_model=list[CompositionOut])
async def list_compositions(db: AsyncSession = Depends(get_db)):
    comps = (await db.execute(select(Composition).order_by(Composition.created_at.desc()))).scalars().all()
    return comps


@router.post("", response_model=CompositionOut)
async def create_composition(body: CompositionIn, db: AsyncSession = Depends(get_db)):
    comp = Composition(
        name=body.name,
        positive_tags=json.dumps([t.model_dump() for t in body.positive_tags], ensure_ascii=False),
        negative_tags=json.dumps([t.model_dump() for t in body.negative_tags], ensure_ascii=False),
    )
    db.add(comp)
    await db.commit()
    await db.refresh(comp)
    return comp


@router.delete("/{comp_id}")
async def delete_composition(comp_id: int, db: AsyncSession = Depends(get_db)):
    comp = await db.get(Composition, comp_id)
    if not comp:
        raise HTTPException(404, "组合不存在")
    await db.delete(comp)
    await db.commit()
    return {"ok": True}
