from datetime import datetime, timedelta
from typing import List, Optional
from ..db.clickhouse import get_clickhouse
from ..schemas.container import ContainerSensorData, TrajectoryPoint, AnomalyEvent


def insert_sensor_data(data: ContainerSensorData):
    client = get_clickhouse()
    query = """
        INSERT INTO sensor_logs
        (container_id, timestamp, temperature, humidity, latitude, longitude, compressor_status, solar_intensity)
        VALUES
    """
    client.execute(
        query,
        [
            (
                data.container_id,
                data.timestamp,
                data.temperature,
                data.humidity,
                data.latitude,
                data.longitude,
                1 if data.compressor_status else 0,
                data.solar_intensity or 0.0,
            )
        ],
    )


def get_trajectory(
    container_id: str,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
) -> List[TrajectoryPoint]:
    client = get_clickhouse()

    if not start_time:
        start_time = datetime.now() - timedelta(days=7)
    if not end_time:
        end_time = datetime.now()

    query = """
        SELECT timestamp, latitude, longitude, temperature, humidity
        FROM sensor_logs
        WHERE container_id = %(container_id)s
          AND timestamp >= %(start_time)s
          AND timestamp <= %(end_time)s
        ORDER BY timestamp ASC
    """
    rows = client.execute(
        query,
        {
            "container_id": container_id,
            "start_time": start_time,
            "end_time": end_time,
        },
    )

    return [
        TrajectoryPoint(
            timestamp=row[0],
            latitude=row[1],
            longitude=row[2],
            temperature=row[3],
            humidity=row[4],
        )
        for row in rows
    ]


def get_current_position(container_id: str) -> Optional[TrajectoryPoint]:
    client = get_clickhouse()
    query = """
        SELECT timestamp, latitude, longitude, temperature, humidity
        FROM sensor_logs
        WHERE container_id = %(container_id)s
        ORDER BY timestamp DESC
        LIMIT 1
    """
    rows = client.execute(query, {"container_id": container_id})
    if rows:
        row = rows[0]
        return TrajectoryPoint(
            timestamp=row[0],
            latitude=row[1],
            longitude=row[2],
            temperature=row[3],
            humidity=row[4],
        )
    return None


def get_all_active_containers() -> List[str]:
    client = get_clickhouse()
    query = """
        SELECT DISTINCT container_id
        FROM sensor_logs
        WHERE timestamp >= now() - INTERVAL 1 DAY
    """
    rows = client.execute(query)
    return [row[0] for row in rows]


def get_temperature_stats(container_id: str, hours: int = 24):
    client = get_clickhouse()
    query = """
        SELECT
            min(temperature),
            max(temperature),
            avg(temperature),
            count()
        FROM sensor_logs
        WHERE container_id = %(container_id)s
          AND timestamp >= now() - INTERVAL %(hours)s HOUR
    """
    result = client.execute(query, {"container_id": container_id, "hours": hours})
    if result:
        row = result[0]
        return {
            "min_temp": row[0],
            "max_temp": row[1],
            "avg_temp": row[2],
            "data_points": row[3],
        }
    return None
