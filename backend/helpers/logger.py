import logging
from datetime import datetime
from functools import wraps
from pathlib import Path

from pytz import timezone


class Logger:
    """Simple logger that redirects all logging to request-specific files"""

    def __init__(self, log_dir=None):
        if log_dir is None:
            # Use the log directory at project root
            project_root = Path(__file__).parent.parent
            log_dir = project_root / "logs"

        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)

        # Indian timezone
        self.ist = timezone("Asia/Kolkata")

    def create_log_file(self, log_file_full_path):
        """
        Create a log file for a specific paper generation request

        Args:
            paper_name (str): Name of the paper being generated
            author (str): Author/user generating the paper

        Returns:
            logging.FileHandler: File handler for the log file
        """
        # Create file handler
        file_handler = logging.FileHandler(log_file_full_path, mode="w", encoding="utf-8")
        file_handler.setLevel(logging.INFO)

        # Create formatter with IST timezone
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s", datefmt="%d-%m-%Y %H:%M:%S IST"
        )
        formatter.converter = lambda *args: datetime.now(self.ist).timetuple()
        file_handler.setFormatter(formatter)

        return file_handler

    def get_log_file(self, log_file_full_path):
        # Create file handler
        file_handler = logging.FileHandler(log_file_full_path, mode="a", encoding="utf-8")
        file_handler.setLevel(logging.INFO)

        # Create formatter with IST timezone
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s", datefmt="%d-%m-%Y %H:%M:%S IST"
        )
        formatter.converter = lambda *args: datetime.now(self.ist).timetuple()
        file_handler.setFormatter(formatter)

        return file_handler

    def set_global_logging(self, file_handler):
        """Add file logging while keeping console logging"""
        # Get the root logger
        root_logger = logging.getLogger()

        # # Remove existing file handlers to avoid duplicates (but keep console handlers)
        # handlers_to_remove = []
        # for handler in root_logger.handlers:
        #     if isinstance(handler, logging.FileHandler):
        #         handlers_to_remove.append(handler)
        #
        # for handler in handlers_to_remove:
        #     root_logger.removeHandler(handler)
        #     handler.close()

        # Ensure we have a console handler
        has_console_handler = any(
            isinstance(handler, logging.StreamHandler) and not isinstance(handler, logging.FileHandler)
            for handler in root_logger.handlers
        )

        if not has_console_handler:
            console_handler = logging.StreamHandler()
            console_handler.setLevel(logging.INFO)
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s", datefmt="%d-%m-%Y %H:%M:%S IST"
            )
            formatter.converter = lambda *args: datetime.now(self.ist).timetuple()
            console_handler.setFormatter(formatter)
            root_logger.addHandler(console_handler)

        # Add the new file handler (console handlers remain)
        root_logger.addHandler(file_handler)
        root_logger.setLevel(logging.INFO)

    def clear_global_logging(self):
        """Clear the global logging redirection"""
        root_logger = logging.getLogger()

        # Remove file handlers
        handlers_to_remove = []
        for handler in root_logger.handlers:
            if isinstance(handler, logging.FileHandler):
                handlers_to_remove.append(handler)

        for handler in handlers_to_remove:
            root_logger.removeHandler(handler)
            handler.close()


def with_logging(func):
    """Decorator for Celery tasks to automatically set up logging"""

    @wraps(func)
    def wrapper(self, *args, **kwargs):
        # Get log file info from kwargs
        log_file_info = kwargs.get("log_file_info")
        paper_name = log_file_info.get("paper_name", "celery_unknown_paper")
        author = log_file_info.get("author", "unknown_author")
        full_log_file_path = log_file_info.get("full_log_file_path")
        file_handler = None

        if log_file_info:
            try:
                log_file_path = Path(full_log_file_path)
                if not log_file_path.exists():
                    raise Exception("FileNameDoesNotExist/FileNotFound at the specified path")

                file_handler = logger.get_log_file(log_file_full_path=full_log_file_path)
            except Exception as e:
                print(f"Creating a new log file from celery. Reason - {str(e)}")
                # Get log_filepath by regenerating it
                log_filepath, log_file_name = build_log_file_name(paper_name, author)

                file_handler = logger.create_log_file(log_filepath)
            finally:
                logger.set_global_logging(file_handler)

                # Log task start
                logger = logging.getLogger("celery_task")
                logger.info(f"Celery task started for paper: {paper_name} by {author}")
                logger.info("=" * 60)

        try:
            # Execute the actual task
            result = func(self, *args, **kwargs)

            # Log successful completion
            if file_handler:
                logger = logging.getLogger("celery_task")
                logger.info("Celery task completed successfully")
                logger.info("=" * 60)

            return result

        except Exception as e:
            # Log task failure
            if file_handler:
                logger = logging.getLogger("celery_task")
                logger.error(f"Celery task failed: {type(e).__name__}: {str(e)}")
                logger.info("=" * 60)
            raise

        finally:
            # Clean up logging
            if file_handler:
                logger.clear_global_logging()

    return wrapper


# Global instance for easy access
logger = Logger()


def build_log_file_name(paper_name, author):
    # Generate timestamp in Indian timezone
    now = datetime.now(timezone("Asia/Kolkata"))
    timestamp = now.strftime("%d-%m-%Y-%H:%M:%S")

    # Create log filename in required format
    log_filename = f"{paper_name}-{author}-{timestamp}.log"
    log_filepath = logger.log_dir / log_filename
    return log_filepath, log_filename
