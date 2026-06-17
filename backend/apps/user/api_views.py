import hashlib
import os
import traceback
from datetime import datetime, timedelta

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from starlette.responses import HTMLResponse, JSONResponse

from apps.user.models import User
from apps.user.serializer import (
    ChangePasswordRequest,
    ForgotPasswordRequestSerializer,
    UserLoginRequest,
    UserSignupRequest,
)
from helpers.email import EmailCredentials, EmailService
from main.settings import EMAIL_CREDS, FRONTEND_LOGIN_URL, db_connection

# Security
security = HTTPBearer()
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


class UserView:
    def __init__(self):
        pass

    def get_email_service(self) -> EmailService:
        """Get configured email service based on environment"""
        credentials = EmailCredentials(
            tenant_id=EMAIL_CREDS["tenant_id"],
            client_id=EMAIL_CREDS["client_id"],
            client_secret=EMAIL_CREDS["client_secret"],
            sender=EMAIL_CREDS["sender"],
        )

        return EmailService(credentials)

    def validate_email(self, email: str) -> bool:
        """Validate if email belongs to allowed  domains"""
        # allowed_domains = []
        # return any(email.endswith(domain) for domain in allowed_domains)
        return True

    def hash_password(self, password: str) -> str:
        """Hash password using SHA256"""
        return hashlib.sha256(password.encode()).hexdigest()

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return self.hash_password(plain_password) == hashed_password

    def validate_user_for_password_reset(self, email: str, db: Session):
        """Validate user exists and email is verified for password reset"""
        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found. Please sign up first.")

        # Check if email is verified
        if not user.is_email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please verify your email first before resetting password.",
            )

        return user

    def create_access_token(self, user_id: str, email: str) -> str:
        """Create JWT token with user_id and email"""
        expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
        to_encode = {"user_id": str(user_id), "email": email, "exp": expire}
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    def verify_token(self, credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
        """Verify JWT token and return user info"""
        token = credentials.credentials
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str = payload.get("user_id")
            email: str = payload.get("email")
            if user_id is None or email is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return {"user_id": user_id, "email": email}
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )

    async def signup(self, request: Request, db: Session = Depends(db_connection.get_conn)):
        """User signup endpoint"""
        try:
            data = await request.json()

            # Validate request data
            try:
                user_data = UserSignupRequest(**data)
            except Exception as e:
                response = {"message": f"Invalid request data: {str(e)}"}
                return JSONResponse(content=response, status_code=status.HTTP_400_BAD_REQUEST)

            # Validate email domain
            if not self.validate_email(user_data.email):
                response = {
                    "message": "Please use a valid  email address"
                }
                return JSONResponse(content=response, status_code=status.HTTP_400_BAD_REQUEST)

            # Check if user already exists
            existing_user = db.query(User).filter(User.email == user_data.email).first()
            if existing_user:
                response = {"message": "Email already registered"}
                return JSONResponse(content=response, status_code=status.HTTP_400_BAD_REQUEST)

            # Generate verification token
            verification_token = EmailService.generate_verification_token()

            # Hash password and create user
            hashed_password = self.hash_password(user_data.password)
            new_user = User(
                name=user_data.name,
                email=user_data.email,
                password=hashed_password,
                email_verification_token=verification_token,
            )

            db.add(new_user)
            db.commit()
            db.refresh(new_user)

            # Send verification email
            try:
                email_service = self.get_email_service()

                email_sent = email_service.send_verification_email(
                    user_data.email, verification_token, FRONTEND_LOGIN_URL
                )

                if not email_sent:
                    print("Warning: Failed to send verification email")
            except Exception as e:
                print(f"Error sending verification email: {str(e)}")

            response = {
                "message": "User created successfully. Please check your email to verify your account before logging in.",
                "user": {
                    "id": str(new_user.id),
                    "name": new_user.name,
                    "email": new_user.email,
                    "created_at": new_user.created_at.isoformat(),
                    "is_email_verified": new_user.is_email_verified,
                },
            }
            return JSONResponse(content=response, status_code=status.HTTP_201_CREATED)

        except Exception as e:
            db.rollback()
            traceback.print_exc()
            response = {"message": f"Error creating user: {str(e)}"}
            return JSONResponse(content=response, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

    async def login(self, request: Request, db: Session = Depends(db_connection.get_conn)):
        """User login endpoint"""
        try:
            data = await request.json()

            # Validate request data
            try:
                login_data = UserLoginRequest(**data)
            except Exception as e:
                response = {"message": f"Invalid request data: {str(e)}"}
                return JSONResponse(content=response, status_code=status.HTTP_400_BAD_REQUEST)

            # Validate email domain
            if not self.validate_email(login_data.email):
                response = {
                    "message": "Please use a valid email address"
                }
                return JSONResponse(content=response, status_code=status.HTTP_400_BAD_REQUEST)

            # Find user by email
            user = db.query(User).filter(User.email == login_data.email).first()
            if not user:
                response = {"message": "Invalid email or password"}
                return JSONResponse(content=response, status_code=status.HTTP_401_UNAUTHORIZED)

            # Verify password
            if not self.verify_password(login_data.password, user.password):
                response = {"message": "Invalid email or password"}
                return JSONResponse(content=response, status_code=status.HTTP_401_UNAUTHORIZED)

            # Check email verification
            if not user.is_email_verified:
                response = {
                    "message": "Please verify your email address before logging in. Check your email for verification link."
                }
                return JSONResponse(content=response, status_code=status.HTTP_403_FORBIDDEN)

            # Create token
            token = self.create_access_token(user.id, user.email)

            response = {
                "message": "Login successful",
                "user": {
                    "id": str(user.id),
                    "name": user.name,
                    "email": user.email,
                    "created_at": user.created_at.isoformat(),
                },
                "token": token,
            }
            return JSONResponse(content=response, status_code=status.HTTP_200_OK)

        except Exception as e:
            traceback.print_exc()
            response = {"message": f"Error during login: {str(e)}"}
            return JSONResponse(content=response, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

    async def get_current_user(self, request: Request, db: Session = Depends(db_connection.get_conn)):
        """Get current user info from token"""
        try:
            # Extract token from Authorization header
            authorization: str = request.headers.get("Authorization")
            if not authorization:
                response = {"message": "Authorization header missing"}
                return JSONResponse(content=response, status_code=status.HTTP_401_UNAUTHORIZED)

            try:
                scheme, token = authorization.split()
                if scheme.lower() != "bearer":
                    raise ValueError
            except ValueError:
                response = {"message": "Invalid authorization header format"}
                return JSONResponse(content=response, status_code=status.HTTP_401_UNAUTHORIZED)

            # Verify token
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                user_id = payload.get("user_id")
                email = payload.get("email")

                if user_id is None or email is None:
                    response = {"message": "Invalid token"}
                    return JSONResponse(content=response, status_code=status.HTTP_401_UNAUTHORIZED)

            except jwt.ExpiredSignatureError:
                response = {"message": "Token expired"}
                return JSONResponse(content=response, status_code=status.HTTP_401_UNAUTHORIZED)
            except jwt.JWTError:
                response = {"message": "Invalid token"}
                return JSONResponse(content=response, status_code=status.HTTP_401_UNAUTHORIZED)

            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                response = {"message": "User not found"}
                return JSONResponse(content=response, status_code=status.HTTP_404_NOT_FOUND)

            response = {
                "message": "User retrieved successfully",
                "user": {
                    "id": str(user.id),
                    "name": user.name,
                    "email": user.email,
                    "created_at": user.created_at.isoformat(),
                },
            }
            return JSONResponse(content=response, status_code=status.HTTP_200_OK)

        except Exception as e:
            traceback.print_exc()
            response = {"message": f"Error fetching user: {str(e)}"}
            return JSONResponse(content=response, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

    async def authenticate(self, request: Request, db: Session = Depends(db_connection.get_conn)):
        """Get authentication information for Postman - returns bearer token format"""
        try:
            data = await request.json()

            # Validate request data
            try:
                # postman sends it in username field.
                data["email"] = data.get("username")
                login_data = UserLoginRequest(**data)
            except Exception as e:
                response = {"message": f"Invalid request data: {str(e)}"}
                return JSONResponse(content=response, status_code=status.HTTP_400_BAD_REQUEST)

            # Validate email domain
            if not self.validate_email(login_data.email):
                response = {
                    "message": "Please use a valid email address"
                }
                return JSONResponse(content=response, status_code=status.HTTP_400_BAD_REQUEST)

            # Find user by email
            user = db.query(User).filter(User.email == login_data.email).first()
            if not user:
                response = {"message": "Invalid email or password"}
                return JSONResponse(content=response, status_code=status.HTTP_401_UNAUTHORIZED)

            # Verify password
            if not self.verify_password(login_data.password, user.password):
                response = {"message": "Invalid email or password"}
                return JSONResponse(content=response, status_code=status.HTTP_401_UNAUTHORIZED)

            # Create token
            token = self.create_access_token(user.id, user.email)
            response = {"access_token": token}
            return JSONResponse(content=response, status_code=status.HTTP_200_OK)

        except Exception as e:
            traceback.print_exc()
            response = {"message": f"Error getting auth info: {str(e)}"}
            return JSONResponse(content=response, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

    async def verify_email(self, request: Request, db: Session = Depends(db_connection.get_conn)):
        """Email verification endpoint"""
        try:
            # Get token from query parameter
            token = request.query_params.get("token")
            if not token:
                html_content = """
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Email Verification</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .error { color: red; }
                    </style>
                </head>
                <body>
                    <h1>Email Verification</h1>
                    <p class="error">Invalid verification link. No token provided.</p>
                </body>
                </html>
                """
                return HTMLResponse(content=html_content, status_code=400)

            # Find user with this verification token
            user = db.query(User).filter(User.email_verification_token == token).first()
            if not user:
                html_content = """
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Email Verification</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .error { color: red; }
                    </style>
                </head>
                <body>
                    <h1>Email Verification</h1>
                    <p class="error">Invalid or expired verification link.</p>
                </body>
                </html>
                """
                return HTMLResponse(content=html_content, status_code=200)

            # Check if already verified
            if user.is_email_verified:
                login_url = FRONTEND_LOGIN_URL

                html_content = f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Email Verification</title>
                    <style>
                        body {{ font-family: Arial, sans-serif; text-align: center; padding: 50px; }}
                        .success {{ color: green; }}
                        .redirect-message {{ margin-top: 20px; }}
                        .login-link {{ color: blue; text-decoration: none; }}
                    </style>
                    <script>
                        setTimeout(function() {{
                            window.location.href = "{login_url}";
                        }}, 3000);
                    </script>
                </head>
                <body>
                    <h1>Email Verification</h1>
                    <p class="success">Your email has already been verified!</p>
                    <p>Or <a href="{login_url}" class="login-link">click here to login now</a></p>
                </body>
                </html>
                """
                return HTMLResponse(content=html_content, status_code=200)

            # Mark as verified and clear token
            user.is_email_verified = True
            user.email_verification_token = None
            db.commit()

            # Get frontend URL for redirect
            login_url = FRONTEND_LOGIN_URL

            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Email Verification Successful</title>
                <style>
                    body {{ font-family: Arial, sans-serif; text-align: center; padding: 50px; }}
                    .success {{ color: green; }}
                    .redirect-message {{ margin-top: 20px; }}
                    .login-link {{ color: blue; text-decoration: none; }}
                </style>
                <script>
                    setTimeout(function() {{
                        window.location.href = "{login_url}";
                    }}, 3000);
                </script>
            </head>
            <body>
                <h1>Email Verification Successful!</h1>
                <p class="success">Your email has been successfully verified. You can now log in to your account.</p>
                <p class="redirect-message">Redirecting to login page in 3 seconds...</p>
                <p>Or <a href="{login_url}" class="login-link">click here to login now</a></p>
            </body>
            </html>
            """
            return HTMLResponse(content=html_content, status_code=200)

        except Exception as e:
            traceback.print_exc()
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Email Verification Error</title>
                <style>
                    body {{ font-family: Arial, sans-serif; text-align: center; padding: 50px; }}
                    .error {{ color: red; }}
                </style>
            </head>
            <body>
                <h1>Email Verification</h1>
                <p class="error">An error occurred during verification: {str(e)}</p>
            </body>
            </html>
            """
            return HTMLResponse(content=html_content, status_code=500)

    async def resend_verification_email(self, request: Request, db: Session = Depends(db_connection.get_conn)):
        """Resend email verification endpoint"""
        try:
            data = await request.json()

            # Validate email is provided
            email = data.get("email")
            if not email:
                response = {"message": "Email is required"}
                return JSONResponse(content=response, status_code=status.HTTP_400_BAD_REQUEST)

            # Validate email domain
            if not self.validate_email(email):
                response = {
                    "message": "Please use a valid email address"
                }
                return JSONResponse(content=response, status_code=status.HTTP_400_BAD_REQUEST)

            # Check if user exists
            user = db.query(User).filter(User.email == email).first()
            if not user:
                response = {"message": "Email not found. Please sign up first."}
                return JSONResponse(content=response, status_code=status.HTTP_404_NOT_FOUND)

            # Check if email is already verified
            if user.is_email_verified:
                response = {"message": "Email is already verified. You can proceed to login."}
                return JSONResponse(content=response, status_code=status.HTTP_400_BAD_REQUEST)

            # Generate new verification token
            verification_token = EmailService.generate_verification_token()
            user.email_verification_token = verification_token
            db.commit()

            # Send verification email
            try:
                email_service = self.get_email_service()

                email_sent = email_service.send_verification_email(email, verification_token, FRONTEND_LOGIN_URL)

                if not email_sent:
                    response = {"message": "Failed to send verification email. Please try again later."}
                    return JSONResponse(content=response, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

            except Exception as e:
                print(f"Error sending verification email: {str(e)}")
                response = {"message": "Failed to send verification email. Please try again later."}
                return JSONResponse(content=response, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

            response = {
                "message": "Verification email sent successfully. Please check your email to verify your account."
            }
            return JSONResponse(content=response, status_code=status.HTTP_200_OK)

        except Exception as e:
            db.rollback()
            traceback.print_exc()
            response = {"message": f"Error resending verification email: {str(e)}"}
            return JSONResponse(content=response, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

    async def forgot_password(self, request: Request, db: Session = Depends(db_connection.get_conn)):
        """Forgot password endpoint - generates new random password and emails it to user"""
        try:
            data = await request.json()

            # Validate request data using serializer
            try:
                forgot_password_data = ForgotPasswordRequestSerializer(**data)
            except Exception as e:
                response = {"message": f"Invalid request data: {str(e)}"}
                return JSONResponse(content=response, status_code=status.HTTP_400_BAD_REQUEST)

            # Validate user exists and email is verified
            user = self.validate_user_for_password_reset(forgot_password_data.email, db)

            # Generate new random password
            new_password = EmailService.generate_random_password()
            hashed_password = self.hash_password(new_password)

            # Update user password
            user.password = hashed_password
            db.commit()

            # Send password reset email
            email_service = self.get_email_service()

            email_sent = email_service.send_password_reset_email(forgot_password_data.email, new_password)

            if not email_sent:
                raise Exception("Failed to send password reset email. Please try again later.")

            response = {"message": "Password reset successfully. A new password has been sent to your email address."}
            return JSONResponse(content=response, status_code=status.HTTP_200_OK)

        except Exception as e:
            db.rollback()
            traceback.print_exc()
            response = {"message": f"Error resetting password: {str(e)}"}
            return JSONResponse(content=response, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

    async def change_password(self, request: Request, db: Session = Depends(db_connection.get_conn)):
        """Change password endpoint - requires authentication"""
        try:
            data = await request.json()

            # Validate request data using serializer
            try:
                change_password_data = ChangePasswordRequest(**data)
            except Exception as e:
                response = {"message": f"Invalid request data: {str(e)}"}
                return JSONResponse(content=response, status_code=status.HTTP_400_BAD_REQUEST)

            # Get authenticated user from request (middleware handles auth)
            authenticated_user = request.user

            # Fetch user from database session to ensure changes are tracked
            user = db.query(User).filter(User.id == authenticated_user.id).first()
            if not user:
                response = {"message": "User not found"}
                return JSONResponse(content=response, status_code=status.HTTP_404_NOT_FOUND)

            # Verify current password
            if not self.verify_password(change_password_data.current_password, user.password):
                response = {"message": "Current password is incorrect"}
                return JSONResponse(content=response, status_code=status.HTTP_400_BAD_REQUEST)

            # Hash and update new password
            hashed_new_password = self.hash_password(change_password_data.new_password)
            user.password = hashed_new_password
            db.commit()
            db.refresh(user)

            response = {"message": "Password changed successfully"}
            return JSONResponse(content=response, status_code=status.HTTP_200_OK)

        except Exception as e:
            db.rollback()
            traceback.print_exc()
            response = {"message": f"Error changing password: {str(e)}"}
            return JSONResponse(content=response, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
