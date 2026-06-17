import logging
import os
import re
import traceback

import jwt
from starlette.authentication import AuthenticationBackend, AuthenticationError
from starlette.requests import Request
from starlette.responses import JSONResponse
from urllib3 import request

from apps.user.models import User
from main.settings import db_connection

logger = logging.getLogger(__file__)

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"


class AuthBackend(AuthenticationBackend):
    def __init__(self, excluded_urls={}):
        super().__init__()
        self._excluded_urls = excluded_urls

    def _is_url_excluded(self, path: str, method: str) -> bool:
        """Check if the path and method should be excluded from authentication."""
        for pattern, methods in self._excluded_urls.items():
            if re.match(pattern, path) and method in methods:
                return True

        return False

    async def authenticate(self, request: Request):
        logger.info("Authenticating user......")
        try:
            # Exclude ws and wss urls
            if request.url.scheme in ["ws", "wss"]:
                logger.info("Skipping web socket urls from authentication.")
                return "", User()

            # Extract the Authorization header
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                # Exclude certain paths from authentication
                if self._is_url_excluded(request.url.path, request.scope["method"]):
                    logger.info("Skipping URL as it is excluded from authentication")
                    return "", User()

                # Otherwise raise exception
                raise Exception("Invalid Authorization header. Bearer token not found")

            token = auth_header.split(" ")[1]

            # Verify JWT token
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                user_id = payload.get("user_id")
                email = payload.get("email")

                if user_id is None or email is None:
                    raise Exception("Invalid token payload")

                # Query database to get the user object
                db = db_connection.SessionLocal()
                try:
                    user = db.query(User).filter(User.id == user_id).first()
                    if not user:
                        raise Exception("User not found")

                    logger.info("Success!! User authenticated.")
                    return (token, user)
                finally:
                    db.close()

            except jwt.ExpiredSignatureError:
                raise Exception("Token expired")

        except Exception as e:
            print(traceback.print_exc())
            logger.error(f"Error!! Authenticated failed. Reason - {str(e)}")
            raise AuthenticationError(str(e))


def stance_authenticate(func):
    def wrapper(*args, **kwargs):
        print("Entered authenticate > wrapper")
        try:
            # Extract the Authorization header
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                raise Exception("Invalid Authorization header. Bearer token not found")

            token = auth_header.split(" ")[1]

            # Verify JWT token
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                user_id = payload.get("user_id")
                email = payload.get("email")

                if user_id is None or email is None:
                    raise Exception("Invalid token payload")

                # Query database to get the user object
                db = db_connection.SessionLocal()
                try:
                    user = db.query(User).filter(User.id == user_id).first()
                    if not user:
                        raise Exception("User not found")

                    request.user = user
                    print(f"Authentication success!!!")
                finally:
                    db.close()

            except jwt.ExpiredSignatureError:
                raise Exception("Token expired")
            except jwt.JWTError:
                raise Exception("Invalid token")

        except Exception as e:
            print(f"Exception occurred while authenticating. Reason - {str(e)}")
            print("Exited authenticate > wrapper")
            raise AuthenticationError(str(e))

    print("Exited authenticate > wrapper")
    return wrapper


def auth_error_handler(request, exc):
    return JSONResponse(status_code=401, content={"detail": str(exc)})
