from fastapi import APIRouter

from apps.commons.views import HealthCheckView

api_router = APIRouter()

api_router.add_api_route(path="/api/health", endpoint=HealthCheckView().get_health_check, methods=["GET"])
