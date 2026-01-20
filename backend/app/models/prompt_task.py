"""PromptTask model."""

from typing import Optional, Any
from sqlalchemy import String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base
from app.models.mixins import TimestampMixin


class PromptTask(Base, TimestampMixin):
    """PromptTask model for storing prompt tasks with verification config."""
    
    __tablename__ = "prompt_tasks"
    
    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    db_verification_config: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    def __repr__(self):
        return f"<PromptTask(id='{self.id}', prompt='{self.prompt[:50]}...')>"
