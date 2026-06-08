from clickhouse_driver import Client
from ..config import settings


class ClickHouseClient:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = Client(
                host=settings.clickhouse_host,
                port=settings.clickhouse_port,
                user=settings.clickhouse_user,
                password=settings.clickhouse_password,
                database=settings.clickhouse_database,
            )
        return cls._instance


def get_clickhouse():
    return ClickHouseClient.get_instance()
