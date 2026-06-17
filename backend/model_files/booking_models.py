from sqlalchemy import Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from model_files.base_models import BaseModel
from model_files.enums import BookingStatus


class Booking(BaseModel):
    __tablename__ = "bookings"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    occurrence_id: Mapped[int] = mapped_column(ForeignKey("workshop_occurrences.id"))
    booking_reference: Mapped[str] = mapped_column(unique=True)
    amount: Mapped[int] = mapped_column()
    status: Mapped[BookingStatus] = mapped_column(SQLEnum(BookingStatus), default=BookingStatus.PENDING_PAYMENT)

    user = relationship("User")
    occurrence = relationship("WorkshopOccurrence", back_populates="bookings")
    payment = relationship("Payment", uselist=False, back_populates="booking")
