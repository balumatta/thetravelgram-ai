"""
Read all urls.py from the apps and add it to router
"""
import importlib.util
import os

from main.settings import APPS_DIR


class UrlRouter:
    def __init__(self, app):
        self._app = app

    def import_api_router(self, module_path):
        spec = importlib.util.spec_from_file_location("urls", module_path)
        urls = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(urls)
        return getattr(urls, "api_router", None)

    def add_router_from_apps(self):
        directories = [d for d in os.listdir(APPS_DIR) if os.path.isdir(os.path.join(APPS_DIR, d))]

        # Loop through each directory and import api_router from urls.py
        for directory in directories:
            urls_path = os.path.join(APPS_DIR, directory, "urls.py")
            if os.path.exists(urls_path):
                api_router = self.import_api_router(urls_path)
                if not api_router:
                    continue

                self._app.include_router(api_router)
