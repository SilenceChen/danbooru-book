from datetime import datetime
from pydantic import BaseModel


class CategoryOut(BaseModel):
    id: int
    name: str
    sort_order: int

    model_config = {"from_attributes": True}


class TagCategoryOut(BaseModel):
    category_id: int
    category_name: str
    is_primary: bool
    source: str


class TagOut(BaseModel):
    id: int
    name: str
    name_zh: str | None
    description_zh: str | None
    danbooru_category: int | None
    post_count: int
    representative_image_url: str | None
    translated_at: datetime | None
    categories: list[TagCategoryOut] = []

    model_config = {"from_attributes": True}


class TagListOut(BaseModel):
    total: int
    page: int
    limit: int
    items: list[TagOut]


class TagUpdate(BaseModel):
    name_zh: str | None = None
    description_zh: str | None = None
    # 手动设置分类（覆盖 llm/rule 结果）
    category_ids: list[int] | None = None
    primary_category_id: int | None = None


class CompositionTag(BaseModel):
    id: int
    name: str
    name_zh: str | None = None
    weight: float = 1.0


class CompositionIn(BaseModel):
    name: str
    positive_tags: list[CompositionTag] = []
    negative_tags: list[CompositionTag] = []


class CompositionOut(BaseModel):
    id: int
    name: str
    positive_tags: str  # JSON string
    negative_tags: str  # JSON string
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskStatus(BaseModel):
    status: str   # idle / running / done / error
    progress: int = 0
    total: int = 0
    message: str = ""
