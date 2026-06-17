from datetime import datetime

from sqlalchemy import DateTime, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from model_files.base_models import BaseModel
from model_files.enums import UserRole


class User(BaseModel):
    __tablename__ = "users"

    phone_number: Mapped[str] = mapped_column(unique=True, index=True)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), default=UserRole.ATTENDEE)
    is_active: Mapped[bool] = mapped_column(default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class OTPRequest(BaseModel):
    __tablename__ = "otp_requests"

    phone_number: Mapped[str] = mapped_column()
    otp_hash: Mapped[str] = mapped_column()
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    verified: Mapped[bool] = mapped_column(default=False)


class CreatorProfile(BaseModel):
    __tablename__ = "creator_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    full_name: Mapped[str] = mapped_column()
    display_name: Mapped[str] = mapped_column()
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    instagram_handle: Mapped[str | None] = mapped_column(nullable=True)
    profile_image_url: Mapped[str | None] = mapped_column(nullable=True)

    user = relationship("User")
