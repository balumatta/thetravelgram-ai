from abc import ABC, abstractmethod


class DatabaseConnector(ABC):
    @abstractmethod
    async def get_conn(self):
        pass
