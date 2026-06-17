from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from apps.commons.base_models import Base


class User(Base):
    __tablename__ = "user"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    name = Column(String(50), nullable=False)
    email = Column(String(50), index=True, unique=True, nullable=False)
    password = Column(String, nullable=False)  # Hashed password
    is_email_verified = Column(Boolean, default=False, nullable=True)
    email_verification_token = Column(String, nullable=True)

    papers = relationship("Papers", back_populates="user")

    def __str__(self):
        return f"{self.name}"
