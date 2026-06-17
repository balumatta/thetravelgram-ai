from fastapi import Request
from fastapi.responses import JSONResponse


class HealthCheckView:
    def __init__(self):
        self.response = {"status": "FastAPI backend is healthy!!!"}

    def get_health_check(self, request: Request):
        return JSONResponse(content=self.response)
