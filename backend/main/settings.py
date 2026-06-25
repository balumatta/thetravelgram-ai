import os

from dotenv import load_dotenv

from helpers.database_helpers.db_interfaces import DatabaseConnector
from helpers.database_helpers.rds.database import PostgresDatabaseConnection
from main.config import Environments, get_configurations

BASE_DIR = os.path.dirname((os.path.dirname(__file__)))
APPS_DIR = os.path.join(BASE_DIR, "apps")
MAIN_DIR = os.path.join(BASE_DIR, "main")

################################################################################################
# READ VARIABLES FROM ENV
################################################################################################
dotenv_path = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path)

current_env = os.getenv("ENVIRONMENT", "local").strip()
print("ENVIRONMENT: ", current_env)

valid_envs = [Environments.PROD.value, Environments.DEV.value, Environments.LOCAL.value]

if current_env not in valid_envs:
    print(current_env)
    print("Invalid ENVIRONMENT in config %s" % current_env)
    print("VALID_ENVIRONMENTS ", valid_envs)
    exit(-1)
################################################################################################

################################################################################################
# LOAD CONFIGURATIONS
################################################################################################
configurations = get_configurations(current_env)
################################################################################################


################################################################################################
# RDS DATABASE DETAILS
################################################################################################
RDS_DETAILS = configurations["rds_database_details"]
print("Establishing RDS DB connection........")
db_connection: DatabaseConnector = PostgresDatabaseConnection(RDS_DETAILS)
print("RDS DB connection established!!!!")
################################################################################################

################################################################################################
# S3 DETAILS
################################################################################################
S3_BUCKET_NAME = configurations["s3_storage_configurations"]["bucket_name"]
S3_BASE_DIR = "media/"
################################################################################################


################################################################################################
# MIDDLEWARE SETTINGS
################################################################################################
URLS_TO_BE_IGNORED_FOR_AUTH = {
    r"^/swagger$": ["GET"],
    r"^/static/.*": ["GET"],
    r"^/api/user/login$": ["POST"],
    r"^/api/user/signup$": ["POST"],
    r"^/api/authenticate": ["POST"],
    r"^/api/health$": ["GET"],
    r"^/api/verify-email/$": ["GET"],
    r"^/api/verify-email$": ["GET"],
    r"^/api/user/resend-verification$": ["POST"],
    r"^/api/user/forgot-password/$": ["POST"],
    r"^/api/user/forgot-password$": ["POST"],
}

################################################################################################

################################################################################################
# LLM API KEY DETAILS
################################################################################################
OPEN_API_KEY = os.getenv("OPEN_API_KEY", "").strip()
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

################################################################################################
# REDIS DETAILS
################################################################################################
REDIS_DETAILS = configurations["redis"]
REDIS_HOST = REDIS_DETAILS["host"]

################################################################################################
# EMAIL DETAILS
################################################################################################
EMAIL_CREDS = configurations.get("email_credentials", {})

################################################################################################
# FRONTEND URLS
################################################################################################
FRONTEND_URLS = configurations.get("frontend_urls", {})
FRONTEND_LOGIN_URL = FRONTEND_URLS.get("login_url", "http://localhost:5173")

################################################################################################
# STT Model
################################################################################################

STT_PROVIDER_TYPE = "faster_whisper"

from backend.helpers.stt.stt_provider import STTProviderFactory

STT_MODEL = STTProviderFactory.create_provider(
    provider_type=STT_PROVIDER_TYPE,
)
