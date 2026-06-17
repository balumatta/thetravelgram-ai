from fastapi import APIRouter

from apps.user.api_views import UserView

api_router = APIRouter()

################################# USER APIs ################################################
user_view = UserView()

api_router.add_api_route(path="/api/user/signup", endpoint=user_view.signup, methods=["POST"])
api_router.add_api_route(path="/api/user/login", endpoint=user_view.login, methods=["POST"])
api_router.add_api_route(path="/api/user/me", endpoint=user_view.get_current_user, methods=["GET"])
api_router.add_api_route(path="/api/authenticate", endpoint=user_view.authenticate, methods=["POST"])
api_router.add_api_route(path="/api/verify-email/", endpoint=user_view.verify_email, methods=["GET"])
api_router.add_api_route(
    path="/api/user/resend-verification", endpoint=user_view.resend_verification_email, methods=["POST"]
)
api_router.add_api_route(path="/api/user/forgot-password/", endpoint=user_view.forgot_password, methods=["POST"])
api_router.add_api_route(path="/api/user/change-password", endpoint=user_view.change_password, methods=["POST"])

##################################################################################################################################
