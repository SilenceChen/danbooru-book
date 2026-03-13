import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from database import init_db, AsyncSessionLocal
from crawler.scheduler import start_scheduler, stop_scheduler
from routers import tags, categories, compose, tasks

logging.basicConfig(level=logging.INFO)


SEED_CATEGORIES = [
    "画师", "风格", "角色名称", "镜头", "画面", "背景", "背景建筑",
    "强化属性", "头发", "头部", "手", "脸", "衣服", "裤子", "鞋子",
    "身体", "配饰", "颜色", "姿势", "腿", "口", "眼", "裙子", "袜子",
    "手套", "胸部", "反向关键词", "模板", "画面效果", "食物", "菜",
]


async def seed_categories():
    """初始化预设分类数据"""
    from models import Category
    async with AsyncSessionLocal() as db:
        for i, name in enumerate(SEED_CATEGORIES):
            exists = (await db.execute(select(Category).where(Category.name == name))).scalar_one_or_none()
            if not exists:
                db.add(Category(name=name, sort_order=i))
        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_categories()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="Danbooru Tag Book",
    description="Danbooru tag 管理、翻译与组合工具",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tags.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(compose.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "Danbooru Tag Book API"}
