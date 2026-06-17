import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

import psutil
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.authentication import AuthenticationMiddleware
# from starlette.staticfiles import StaticFiles

from main.config import Environments
from main.settings import URLS_TO_BE_IGNORED_FOR_AUTH, current_env
from main.urls import UrlRouter
from middlewares.authentication import AuthBackend, auth_error_handler

# Create the FastAPI application
app = FastAPI()


# Add authentication middleware
# auth_backend = AuthBackend(URLS_TO_BE_IGNORED_FOR_AUTH)
# app.add_middleware(AuthenticationMiddleware, backend=auth_backend, on_error=auth_error_handler)
# app.add_middleware(
#     CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
# )

# Add all routers from apps
UrlRouter(app).add_router_from_apps()

# Mount static files
# app.mount("/static", StaticFiles(directory="static"), name="static")

# Running the app with Uvicorn
if __name__ == "__main__":
    import uvicorn

    no_of_cpus = psutil.cpu_count(logical=False)
    no_of_workers = int(no_of_cpus / 2) - 1
    # workers = no_of_workers if no_of_workers > 1 else 1
    workers = 1
    print(f"Current CPU(s) found - {no_of_cpus}. Initialising no of workers - {workers}")

    # set reload to False if you want to check concurrency
    is_reload = False if current_env == Environments.PROD else True
    uvicorn.run(
        "run_fastapi:app",
        host="0.0.0.0",
        port=4000,
        reload=is_reload,
        log_level="debug",
        workers=workers,
        timeout_keep_alive=10,
    )
