from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator


class UserSignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    created_at: datetime


class LoginResponse(BaseModel):
    user: UserResponse
    token: str
    message: str


class SignupResponse(BaseModel):
    user: UserResponse
    token: str
    message: str


class ForgotPasswordRequestSerializer(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        # allowed_domains = []
        # if allowed_domains and not any(str(v).endswith(domain) for domain in allowed_domains):
        #     raise ValueError(
        #         "Please use a valid email address"
        #     )
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password_length(cls, v):
        if len(v) < 6:
            raise ValueError("New password must be at least 6 characters long")
        return v
