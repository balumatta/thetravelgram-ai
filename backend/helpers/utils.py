import asyncio
import base64
import functools
import logging
import os
import time
import uuid
from datetime import datetime
from typing import Optional, Tuple

from main.config import get_configurations
from main.settings import BASE_DIR, current_env

logger = logging.getLogger(__file__)


def str_to_bool(v):
    if not v:
        return False

    if type(v) == bool:
        return v

    return v.lower() in ("yes", "true", "t", "1")


def str_to_date_format(date_str, is_utc_needed=False):
    date_formats = [
        "%d-%m-%Y %H:%M:%S.%f",
        "%d-%m-%Y %H:%M:%S",
        "%d-%m-%Y %H:%M",
        "%d-%m-%Y %H",
        "%d-%m-%Y",
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d %H",
        "%Y-%m-%d",
    ]
    try:
        if not date_str:
            return None

        if type(date_str) == datetime:
            return date_str if not is_utc_needed else date_str.utcnow()

        for date_format in date_formats:
            try:
                # Try to parse the date string with the current format
                return datetime.strptime(date_str, date_format)
            except ValueError:
                continue

            # If all formats fail, raise an error
        raise Exception(f"Date string '{date_str}' does not match any expected format.")

    except Exception:
        # print(traceback.print_exc())
        # print(str(e))
        return None


def time_it(func):
    """
    Decorator to measure execution time of both sync and async functions.
    Provides timing data for performance analysis of question generation pipeline.
    """

    def get_function_name(*args, **kwargs):
        """Get function name with class name if it's a method"""
        if args and hasattr(args[0], "__class__"):
            # This is likely a method call, get the class name
            class_name = args[0].__class__.__name__
            return f"{class_name}.{func.__name__}"
        else:
            # This is a regular function or static method
            return func.__name__

    if asyncio.iscoroutinefunction(func):

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            result = await func(*args, **kwargs)
            end_time = time.time()
            function_name = get_function_name(*args, **kwargs)
            print("------------------------------------------------------------")
            print(f"⏱️  {function_name} executed in {end_time - start_time:.6f} seconds")
            print("------------------------------------------------------------")
            return result

        return async_wrapper
    else:

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            result = func(*args, **kwargs)
            end_time = time.time()
            function_name = get_function_name(*args, **kwargs)
            print(f"⏱️  {function_name} executed in {end_time - start_time:.6f} seconds")
            return result

        return sync_wrapper


def log_method_calls(func):
    """
    Decorator to log method entry and exit for debugging and monitoring.
    Logs class name (if any) -> method name entering/exiting
    """

    def get_function_name(*args, **kwargs):
        """Get function name with class name if it's a method"""
        if args and hasattr(args[0], "__class__"):
            # This is likely a method call, get the class name
            class_name = args[0].__class__.__name__
            return f"{class_name} -> {func.__name__}"
        else:
            # This is a regular function or static method
            return func.__name__

    if asyncio.iscoroutinefunction(func):

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            function_name = get_function_name(*args, **kwargs)
            print(f"🔵 {function_name} entering")
            try:
                result = await func(*args, **kwargs)
                print(f"🟢 {function_name} exiting")
                return result
            except Exception as e:
                print(f"🔴 {function_name} exiting [Request interrupted by user] - {str(e)}")
                raise

        return async_wrapper
    else:

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            function_name = get_function_name(*args, **kwargs)
            print(f"🔵 {function_name} entering")
            try:
                result = func(*args, **kwargs)
                print(f"🟢 {function_name} exiting")
                return result
            except Exception as e:
                print(f"🔴 {function_name} exiting [Request interrupted by user] - {str(e)}")
                raise

        return sync_wrapper


class ImageUtils:
    """Utility class for image processing operations"""

    @staticmethod
    def get_static_base_url() -> str:
        """Get the base URL for static files based on environment"""
        try:
            configurations = get_configurations(current_env)

            # Get static URL from config
            static_url = configurations.get("static_urls", {}).get("base_url", "http://localhost:8000/static")

            return static_url
        except Exception as e:
            logger.error(f"Error getting static base URL: {str(e)}")
            return "http://localhost:8000/static"  # Fallback

    @staticmethod
    async def save_base64_image_to_s3(
            base64_data: str, paper_id: str, filename_prefix: str = "question_image"
    ) -> Optional[str]:
        """
        Save base64 encoded image data to S3 bucket

        Args:
            base64_data: Base64 encoded image string (with or without data URL prefix)
            paper_id: The paper ID to organize images by paper
            filename_prefix: Prefix for the generated filename

        Returns:
            Full S3 URL of the saved image or None if failed
        """
        try:
            if not base64_data or not base64_data.strip():
                return None

            # Remove data URL prefix if present
            if base64_data.startswith("data:image/"):
                header, base64_data = base64_data.split(",", 1)
                image_format = header.split(";")[0].split("/")[-1]
            else:
                image_format = "png"  # Default format

            # Generate unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_id = str(uuid.uuid4())[:8]
            filename = f"{filename_prefix}_{timestamp}_{unique_id}.{image_format}"

            # Create S3 key following the pattern: paperBee/questions_images/<paper_id>/filename
            s3_key = f"paperBee/questions_images/{paper_id}/{filename}"

            # Decode base64 image data
            image_data = base64.b64decode(base64_data)

            # Create a BytesIO stream for S3 upload
            import io

            image_stream = io.BytesIO(image_data)

            # Upload to S3
            from helpers.aws import AWSS3

            aws_service = AWSS3()
            s3_url = await aws_service.save_file_to_s3(image_stream, s3_key, "Question image")

            if s3_url:
                logger.info(f"Successfully saved image to S3: {filename}")
                return s3_url
            else:
                logger.error(f"Failed to save image to S3: {filename}")
                return None

        except Exception as e:
            logger.error(f"Error saving base64 image to S3: {str(e)}")
            return None

    @staticmethod
    async def save_image_to_s3(image_file, paper_id: str, filename_prefix: str = "question_image") -> Optional[str]:
        """
        Save uploaded image file directly to S3 bucket

        Args:
            image_file: File-like object with file content and metadata (FastAPI UploadFile)
            paper_id: The paper ID to organize images by paper
            filename_prefix: Prefix for the generated filename

        Returns:
            Full S3 URL of the saved image or None if failed
        """
        try:
            # Extract file extension from content type
            content_type = getattr(image_file, "content_type", "image/png")
            image_format = content_type.split("/")[-1] if "/" in content_type else "png"

            # Generate unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_id = str(uuid.uuid4())[:8]
            filename = f"{filename_prefix}_{timestamp}_{unique_id}.{image_format}"

            # Create S3 key following the pattern: paperBee/questions_images/<paper_id>/filename
            s3_key = f"paperBee/questions_images/{paper_id}/{filename}"

            # Reset file position to beginning if possible
            if hasattr(image_file, "seek"):
                await image_file.seek(0)

            # Get the actual file content
            file_content = image_file.file if hasattr(image_file, "file") else image_file

            # Upload to S3
            from helpers.aws import AWSS3

            aws_service = AWSS3()
            s3_url = await aws_service.save_file_to_s3(file_content, s3_key, "Question image")

            if s3_url:
                logger.info(f"Successfully saved image to S3: {filename}")
                return s3_url
            else:
                logger.error(f"Failed to save image to S3: {filename}")
                return None

        except Exception as e:
            logger.error(f"Error saving image file to S3: {str(e)}")
            return None

    @staticmethod
    def save_base64_image(base64_data: str, filename_prefix: str = "question_image") -> Optional[Tuple[str, str]]:
        """
        Legacy method for saving base64 encoded image data to static/images folder
        This method is kept for backwards compatibility but should use S3 instead

        Args:
            base64_data: Base64 encoded image string (with or without data URL prefix)
            filename_prefix: Prefix for the generated filename

        Returns:
            Tuple of (relative_path, full_url) or None if failed
        """
        try:
            if not base64_data or not base64_data.strip():
                return None

            # Remove data URL prefix if present
            if base64_data.startswith("data:image/"):
                header, base64_data = base64_data.split(",", 1)
                image_format = header.split(";")[0].split("/")[-1]
            else:
                image_format = "png"  # Default format

            # Generate unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_id = str(uuid.uuid4())[:8]
            filename = f"{filename_prefix}_{timestamp}_{unique_id}.{image_format}"

            # Create paths
            static_dir = os.path.join(BASE_DIR, "static")
            images_dir = os.path.join(static_dir, "images")

            # Ensure images directory exists
            os.makedirs(images_dir, exist_ok=True)

            # Save the image
            file_path = os.path.join(images_dir, filename)
            image_data = base64.b64decode(base64_data)

            with open(file_path, "wb") as f:
                f.write(image_data)

            # Return relative path and full URL
            relative_path = f"images/{filename}"
            static_base_url = ImageUtils.get_static_base_url()
            full_url = f"{static_base_url}/{relative_path}"

            logger.info(f"Successfully saved image: {filename}")
            return relative_path, full_url

        except Exception as e:
            logger.error(f"Error saving base64 image: {str(e)}")
            return None

    @staticmethod
    async def process_base64_to_url_s3(
            base64_data: str, paper_id: str, filename_prefix: str = "question_image"
    ) -> Optional[str]:
        """
        Convert base64 image data to S3 file URL

        Args:
            base64_data: Base64 encoded image string (with or without data URL prefix)
            paper_id: The paper ID to organize images by paper
            filename_prefix: Prefix for the generated filename

        Returns:
            Full S3 URL of the saved image or None if failed
        """
        try:
            if not base64_data or not base64_data.strip():
                return None

            if not base64_data.startswith("data:image"):
                # Not a base64 image, return as is (might already be a URL)
                return base64_data

            # Save base64 image to S3 and get URL
            s3_url = await ImageUtils.save_base64_image_to_s3(base64_data, paper_id, filename_prefix)

            if s3_url:
                logger.info(f"Converted base64 to S3 URL: {s3_url}")
                return s3_url
            else:
                logger.warning(f"Failed to convert base64 image to S3 URL")
                return None

        except Exception as e:
            logger.error(f"Error converting base64 to S3 URL: {str(e)}")
            return None

    @staticmethod
    def process_base64_to_url(base64_data: str, filename_prefix: str = "question_image") -> Optional[str]:
        """
        Legacy method: Convert base64 image data to file URL
        This method is kept for backwards compatibility but should use S3 instead

        Args:
            base64_data: Base64 encoded image string (with or without data URL prefix)
            filename_prefix: Prefix for the generated filename

        Returns:
            Full URL of the saved image or None if failed
        """
        try:
            if not base64_data or not base64_data.strip():
                return None

            if not base64_data.startswith("data:image"):
                # Not a base64 image, return as is (might already be a URL)
                return base64_data

            # Save base64 image and get URL
            image_result = ImageUtils.save_base64_image(base64_data, filename_prefix)

            if image_result:
                relative_path, full_url = image_result
                logger.info(f"Converted base64 to URL: {full_url}")
                return full_url
            else:
                logger.warning(f"Failed to convert base64 image to URL")
                return None

        except Exception as e:
            logger.error(f"Error converting base64 to URL: {str(e)}")
            return None
