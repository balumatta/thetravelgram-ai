import logging
from datetime import datetime

from bson import ObjectId
from pymongo import ReturnDocument

from helpers.database_helpers.mongo.db_connector import BaseModalKeys
from helpers.utils import parse_json, time_it
from main.settings import mongo_db_connection

logger = logging.getLogger(__name__)


class MongoDBGenerics:
    def __init__(self, collection_name):
        self.collection_name = collection_name
        self._connection = mongo_db_connection.get_conn()[self.collection_name]

    @staticmethod
    async def get_list_of_entities(entity_obj, sorting_order="asc", start_date=None, end_date=None):
        try:
            if start_date and not end_date:
                list_of_entities = entity_obj.objects.filter(created_at__gte=start_date).order_by("created_at")
                if sorting_order == "desc":
                    list_of_entities = entity_obj.objects.filter(created_at__gte=start_date).order_by("-created_at")
                return list_of_entities

            if start_date and end_date:
                list_of_entities = entity_obj.objects.filter(created_at__range=(start_date, end_date)).order_by(
                    "created_at"
                )
                if sorting_order == "desc":
                    list_of_entities = entity_obj.objects.filter(created_at__range=(start_date, end_date)).order_by(
                        "-created_at"
                    )
                return list_of_entities

            list_of_entities = entity_obj.objects.all().order_by("created_at")
            if sorting_order == "desc":
                list_of_entities = entity_obj.objects.all().order_by("-created_at")
            return list_of_entities

        except Exception as e:
            logger.error("Exception occurred while getting entity by pk")
            logger.error(str(e))
            return None

    @staticmethod
    async def add_record_id_and_date(data):
        record_id = data.get(BaseModalKeys.record_id, None)
        if not record_id:
            data[BaseModalKeys.record_id] = ObjectId()

        created_at = data.get(BaseModalKeys.created_at, None)
        if not created_at:
            data[BaseModalKeys.created_at] = str(datetime.utcnow())

    async def save(self, data, is_multiple=False):
        try:
            if not is_multiple:
                await self.add_record_id_and_date(data)
                data = await self.find_and_update(data, searchQuery={"_id": data["_id"]})
                # data = self._connection.insert_one(data)
                return parse_json(data)
            else:
                for d in data:
                    await self.add_record_id_and_date(d)

                rows = await self._connection.insert_many(data)
                data = [row for row in rows.inserted_ids]
                return data
        except Exception as e:
            logger.error(f"Exception occurred while saving the entity {self.collection_name}")
            logger.error(str(e))
            return None

    @time_it
    async def get_all_data(self, page_no, limit=10, custom_pipeline=[]):
        limit = int(limit)
        offset = (int(page_no) - 1) * limit

        pipeline = [
            {"$sort": {"created_at": -1}},
            {"$skip": offset},
            {"$limit": limit},
        ]

        if custom_pipeline:
            pipeline = custom_pipeline

        results = await self._connection.aggregate(pipeline)

        total_count = 0
        all_rows = []

        async for result in results:
            if "data" in result:
                all_data = result["data"]
                all_rows = [parse_json(row) for row in all_data]

            if "metadata" in result and len(result["metadata"]) > 0:
                total_count = result["metadata"][0].get("total", 0)

        return all_rows, total_count

    async def get_all_data_with_no_limits(self, custom_pipeline):
        results = await self._connection.aggregate(custom_pipeline)
        all_data = [res async for res in results]
        return all_data

    async def find(self, filters={}):
        return await self._connection.find(filters)

    async def update_many(self, filters, updated_data):
        return await self._connection.update_many(filters, updated_data)

    async def get_count(self, filters={}):
        return await self._connection.count_documents(filters)

    async def get_by_id(self, id):
        data = await self._connection.find_one({"_id": ObjectId(id)})
        return parse_json(data)

    async def get_by_title(self, title):
        data = await self._connection.find_one({"title": title})
        return parse_json(data)

    async def get_by_param(self, filters, sort=None, is_multiple=False):
        if not filters:
            return None

        if not is_multiple:
            data = await self._connection.find_one(filters)
            return parse_json(data)

        data = [parse_json(row) async for row in self._connection.find(filters)]
        return data

    async def update(self, id, update_data):
        if type(id) != ObjectId:
            id = ObjectId(id)

        filter = {"_id": id}
        update_data = update_data
        data_obj = await self._connection.find_one_and_update(
            filter, update={"$set": update_data}, return_document=ReturnDocument.AFTER, upsert=True
        )
        return parse_json(data_obj)

    async def update_using_push(self, id, key, new_data):
        if type(id) != ObjectId:
            id = ObjectId(id)

        await self._connection.update_one(
            {"_id": id},  # Filter to match the specific document by _id
            {"$push": {key: new_data}},  # Push the new ObjectId to the rebuttal_ids list
        )

    async def remove_using_pull(self, id, key, data_to_remove):
        if type(id) != ObjectId:
            id = ObjectId(id)

        await self._connection.update_one({"_id": id}, {"$pull": {key: data_to_remove}})

    async def delete_by_pk(self, id):
        return await self._connection.delete_one({"_id": ObjectId(id)})

    async def delete_by_query(self, search_query):
        return await self._connection.delete_many(search_query)

    async def find_and_update(self, data, searchQuery={}):
        saved_document = await self._connection.find_one_and_update(
            searchQuery,  # Search criteria: find by email
            {"$setOnInsert": data},  # Insert this document if no match is found
            upsert=True,  # Insert the document if it does not exist
            return_document=True,  # Return the document after the update/insert
        )
        return saved_document
