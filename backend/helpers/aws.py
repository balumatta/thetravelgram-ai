import logging

import boto3

from main.settings import S3_BUCKET_NAME, configurations

logger = logging.getLogger(__name__)


class AWSS3:
    def __init__(self) -> None:
        self.s3_config = configurations["s3_storage_configurations"]
        self.s3_connection = self.create_s3_connection()

    def create_s3_connection(self):
        s3_connection = boto3.client(
            "s3",
            aws_access_key_id=self.s3_config["aws_access_key"],
            aws_secret_access_key=self.s3_config["aws_access_secret"],
            region_name=self.s3_config["region_name"],
        )

        return s3_connection

    def get_s3_url(self, file_key):
        return f"https://{S3_BUCKET_NAME}.s3.{self.s3_config['region_name']}.amazonaws.com/{file_key}"

    def generate_presigned_url(self, file_key, expiration=3600):
        try:
            response = self.s3_connection.generate_presigned_url(
                "get_object", Params={"Bucket": S3_BUCKET_NAME, "Key": file_key}, ExpiresIn=expiration
            )
            logger.info(f"Generated presigned URL for {file_key}")
            return response
        except Exception as e:
            logger.error(f"Failed to generate presigned URL: {str(e)}")
            return None

    async def save_file_to_s3(self, file_stream, file_key, file_type="file"):
        try:
            self.s3_connection.upload_fileobj(file_stream, S3_BUCKET_NAME, file_key)
            logger.info(f"{file_type} successfully uploaded to S3 as {file_key}")
            return self.get_s3_url(file_key)
        except Exception as e:
            logger.error(f"Failed to upload {file_type} to S3: {str(e)}")
            return None

    # Backward compatibility methods
    async def save_pdf_to_s3(self, file_stream, file_key):
        return await self.save_file_to_s3(file_stream, file_key, "PDF")

    async def save_word_to_s3(self, file_stream, file_key):
        return await self.save_file_to_s3(file_stream, file_key, "Word document")


awss3 = AWSS3()
