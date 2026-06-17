#!/usr/bin/env python
#######################################################################################
import logging

from pymongo import AsyncMongoClient

from helpers.database_helpers.db_interfaces import DatabaseConnector

logger = logging.getLogger(__name__)


class MongoDBConnector(DatabaseConnector):
    def __init__(self, mongo_db_details):
        self.mongo_db_details = mongo_db_details
        self.db_name = self.mongo_db_details["NAME"]
        self.db_host = self.mongo_db_details["HOST"]
        self.db_user = self.mongo_db_details["USER"]
        self.db_pass = self.mongo_db_details["PASSWORD"]

        self.mongo_client = AsyncMongoClient(
            f"mongodb+srv://{self.db_user}:{self.db_pass}@{self.db_host}/?retryWrites=true&w=majority"
        )
        self.db = self.mongo_client[self.db_name]

    async def get_conn(self):
        try:
            yield self.db
        except Exception as e:
            logger.error(f"Something went wrong while getting the connection to the specified collection - {str(e)}")


class BaseModalKeys:
    record_id = "_id"
    created_at = "created_at"


# if __name__ == '__main__':
#     user = MongoDBConnector().get_connection_to_collection(collection_name='base_user')
#     asyncio.create_task(user.insert_one({'username': 'Balu'}))
