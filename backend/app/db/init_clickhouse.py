from clickhouse_driver import Client
from ..config import settings


def init_clickhouse(client: Client):
    client.execute(f"CREATE DATABASE IF NOT EXISTS {settings.clickhouse_database}")

    client.execute("""
        CREATE TABLE IF NOT EXISTS sensor_logs (
            container_id String,
            timestamp DateTime,
            temperature Float64,
            humidity Float64,
            latitude Float64,
            longitude Float64,
            compressor_status UInt8,
            solar_intensity Float64,
            date Date MATERIALIZED toDate(timestamp)
        ) ENGINE = MergeTree(date, (container_id, timestamp), 8192)
    """)

    client.execute("""
        CREATE TABLE IF NOT EXISTS anomaly_events (
            id Int64,
            container_id String,
            start_time DateTime,
            end_time DateTime,
            max_temperature Float64,
            severity String,
            status String,
            created_at DateTime DEFAULT now()
        ) ENGINE = MergeTree(created_at, (container_id, id), 8192)
    """)


if __name__ == "__main__":
    from ..db.clickhouse import get_clickhouse

    client = get_clickhouse()
    init_clickhouse(client)
    print("ClickHouse database and tables initialized.")
