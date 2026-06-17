from enum import Enum


class Environments(Enum):
    LOCAL = "local"
    DEV = "dev"
    PROD = "prod"


def get_configurations(env) -> dict:
    config_details = {
        Environments.LOCAL.value: {
            "rds_database_details": {
                "ENGINE": "postgresql",
                "NAME": "testdb",
                "USER": "testuser",
                "PASSWORD": "testpassword",
                "HOST": "localhost",
                "PORT": "5432",
            },
            "s3_storage_configurations": {
                "aws_access_key": "",
                "aws_access_secret": "",
                "bucket_name": "",
                "region_name": "",
            },
            "redis": {"host": "localhost"},
            "email_credentials": {
                "tenant_id": "",
                "client_id": "",
                "client_secret": "",
                "sender": "",
            },
            "frontend_urls": {"login_url": "http://localhost:5173"},
            "static_urls": {"base_url": "http://localhost:9000/static"},
        },
        Environments.DEV.value: {
            "rds_database_details": {
                "ENGINE": "postgresql",
                "NAME": "testdb",
                "USER": "testuser",
                "PASSWORD": "testpassword",
                "HOST": "localhost",
                "PORT": "5432",
            },
            "s3_storage_configurations": {
                "aws_access_key": "",
                "aws_access_secret": "",
                "bucket_name": "",
                "region_name": "",
            },
            "redis": {"host": "localhost"},
            "email_credentials": {
                "tenant_id": "",
                "client_id": "",
                "client_secret": "",
                "sender": "",
            },
            "frontend_urls": {"login_url": "http://localhost:5173"},
            "static_urls": {"base_url": "http://localhost:9000/static"},
        },
        Environments.PROD.value: {
            "rds_database_details": {
                "ENGINE": "postgresql",
                "NAME": "testdb",
                "USER": "testuser",
                "PASSWORD": "testpassword",
                "HOST": "localhost",
                "PORT": "5432",
            },
            "s3_storage_configurations": {
                "aws_access_key": "",
                "aws_access_secret": "",
                "bucket_name": "",
                "region_name": "",
            },
            "redis": {"host": "localhost"},
            "email_credentials": {
                "tenant_id": "",
                "client_id": "",
                "client_secret": "",
                "sender": "",
            },
            "frontend_urls": {"login_url": "http://localhost:5173"},
            "static_urls": {"base_url": "http://localhost:9000/static"},
        },
    }
    return config_details.get(env, {})
