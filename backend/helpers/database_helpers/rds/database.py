import logging

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import scoped_session, sessionmaker

from helpers.database_helpers.db_interfaces import DatabaseConnector

logger = logging.getLogger(__name__)


class PostgresDatabaseConnection(DatabaseConnector):
    def __init__(self, db_details, db_schema_name=None):
        db_host = db_details.get("HOST", None)
        db_username = db_details.get("USER", None)
        db_password = db_details.get("PASSWORD", None)
        db_name = db_details.get("NAME", None)

        # Sync database connection (existing)
        self.database_url = f"postgresql+psycopg2://{db_username}:{db_password}@{db_host}:5432/{db_name}"
        self.engine = create_engine(
            self.database_url,
            pool_recycle=600,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=5,
            pool_timeout=30,
            connect_args={"application_name": "paperbee_backend"},
        )
        self.SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=self.engine))

        # Async database connection (new)
        self.async_database_url = f"postgresql+asyncpg://{db_username}:{db_password}@{db_host}:5432/{db_name}"
        self.async_engine = create_async_engine(
            self.async_database_url,
            pool_recycle=600,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=5,
            pool_timeout=30,
        )
        self.AsyncSessionLocal = async_sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.async_engine
        )

    async def get_conn(self):
        print("🔍 DB: Creating session...")
        db = self.SessionLocal()
        print("🔍 DB: Session created, yielding...")
        try:
            yield db
        except Exception as e:
            print(f"🔍 DB: Exception during session: {e}")
            raise
        finally:
            print("🔍 DB: Closing session...")
            db.close()
            print("🔍 DB: Session closed.")

    def get_async_conn(self):
        from contextlib import asynccontextmanager

        @asynccontextmanager
        async def session_manager():
            print("🔍 DB: Creating async session...")
            async_db = self.AsyncSessionLocal()
            print("🔍 DB: Async session created, yielding...")
            try:
                yield async_db
            except Exception as e:
                print(f"🔍 DB: Exception during async session: {e}")
                await async_db.rollback()
                raise
            finally:
                print("🔍 DB: Closing async session...")
                await async_db.close()
                print("🔍 DB: Async session closed.")

        return session_manager()
