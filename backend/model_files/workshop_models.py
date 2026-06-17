from datetime import datetime

from sqlalchemy import DateTime, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from model_files.base_models import BaseModel
from model_files.enums import WorkshopStatus


class Category(BaseModel):
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(unique=True)
    is_active: Mapped[bool] = mapped_column(default=True)


class Workshop(BaseModel):
    __tablename__ = "workshops"

    creator_id: Mapped[int] = mapped_column(ForeignKey("creator_profiles.id"))
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))
    title: Mapped[str] = mapped_column()
    description: Mapped[str] = mapped_column(Text)
    cover_image_url: Mapped[str | None] = mapped_column(nullable=True)
    status: Mapped[WorkshopStatus] = mapped_column(SQLEnum(WorkshopStatus), default=WorkshopStatus.PENDING)

    creator = relationship("CreatorProfile")
    category = relationship("Category")
    occurrences = relationship("WorkshopOccurrence", back_populates="workshop", cascade="all, delete-orphan")


class WorkshopOccurrence(BaseModel):
    __tablename__ = "workshop_occurrences"

    workshop_id: Mapped[int] = mapped_column(ForeignKey("workshops.id"))
    venue_name: Mapped[str] = mapped_column()
    venue_address: Mapped[str] = mapped_column(Text)
    latitude: Mapped[float] = mapped_column()
    longitude: Mapped[float] = mapped_column()
    start_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    capacity: Mapped[int] = mapped_column()
    price: Mapped[int] = mapped_column()

    workshop = relationship("Workshop", back_populates="occurrences")
    bookings = relationship("Booking", back_populates="occurrence")
