from celery import Celery


class CeleryConnector:
    def __init__(self, redis_host="localhost", port=6379, db=1):
        self.redis_host = redis_host
        self.port = port
        self.db = db

    def connect(self):
        celery_app = Celery(
            "paperbee",
            backend=f"redis://{self.redis_host}:{self.port}/{self.db}",  # Where Celery stores results
            broker=f"redis://{self.redis_host}:{self.port}/{self.db}",  # Message queue (Redis)
        )
        celery_app.conf.update(
            task_acks_late=True,
            task_reject_on_worker_lost=True,
        )
        return celery_app
