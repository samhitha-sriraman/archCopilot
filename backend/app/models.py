import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Design(Base):
    __tablename__ = "designs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    versions: Mapped[list["DesignVersion"]] = relationship(
        "DesignVersion", back_populates="design", cascade="all, delete-orphan"
    )


class DesignVersion(Base):
    __tablename__ = "design_versions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    design_id: Mapped[str] = mapped_column(String, ForeignKey("designs.id"), nullable=False)
    spec_text: Mapped[str] = mapped_column(Text, nullable=False)
    output_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    version_num: Mapped[int] = mapped_column(Integer, nullable=False)

    design: Mapped[Design] = relationship("Design", back_populates="versions")
