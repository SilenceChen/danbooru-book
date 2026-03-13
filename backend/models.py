from datetime import datetime
from sqlalchemy import Integer, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    tag_categories: Mapped[list["TagCategory"]] = relationship(
        back_populates="category", lazy="selectin"
    )


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name_zh: Mapped[str | None] = mapped_column(String(100))
    description_zh: Mapped[str | None] = mapped_column(Text)
    # Danbooru 原始分类: 0=General, 1=Artist, 3=Copyright, 4=Character, 5=Meta
    danbooru_category: Mapped[int | None] = mapped_column(Integer)
    post_count: Mapped[int] = mapped_column(Integer, default=0)
    representative_image_url: Mapped[str | None] = mapped_column(Text)
    crawled_at: Mapped[datetime | None] = mapped_column(DateTime)
    translated_at: Mapped[datetime | None] = mapped_column(DateTime)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime)

    tag_categories: Mapped[list["TagCategory"]] = relationship(
        back_populates="tag", lazy="selectin", cascade="all, delete-orphan"
    )


class TagCategory(Base):
    __tablename__ = "tag_categories"

    tag_id: Mapped[int] = mapped_column(
        ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True
    )
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    # 来源优先级: manual > rule > llm
    source: Mapped[str] = mapped_column(String(10), default="llm")

    tag: Mapped["Tag"] = relationship(back_populates="tag_categories")
    category: Mapped["Category"] = relationship(back_populates="tag_categories")


class Composition(Base):
    __tablename__ = "compositions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    positive_tags: Mapped[str] = mapped_column(Text, default="[]")  # JSON [{id, name, weight}]
    negative_tags: Mapped[str] = mapped_column(Text, default="[]")  # JSON [{id, name, weight}]
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
