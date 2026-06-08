from datetime import datetime, timedelta
from typing import Optional
from ..db.clickhouse import get_clickhouse
from ..utils.shelf_life import predict_shelf_life_from_trajectory


def get_shelf_life_prediction(
    container_id: str,
    cargo_type: str = "默认",
    lookback_hours: int = 48,
) -> dict:
    client = get_clickhouse()

    query = """
        SELECT
            timestamp,
            temperature
        FROM sensor_logs
        WHERE container_id = %(container_id)s
          AND timestamp >= now() - INTERVAL %(lookback_hours)s HOUR
        ORDER BY timestamp ASC
    """

    rows = client.execute(
        query,
        {"container_id": container_id, "lookback_hours": lookback_hours},
    )

    if not rows:
        return predict_shelf_life_from_trajectory([], cargo_type, lookback_hours)

    trajectory_points = [
        {"timestamp": row[0], "temperature": row[1]} for row in rows
    ]

    return predict_shelf_life_from_trajectory(trajectory_points, cargo_type, lookback_hours)


def get_batch_shelf_life(
    container_ids: list,
    cargo_type_map: Optional[dict] = None,
    lookback_hours: int = 48,
) -> dict:
    results = {}
    for cid in container_ids:
        cargo_type = cargo_type_map.get(cid, "默认") if cargo_type_map else "默认"
        try:
            results[cid] = get_shelf_life_prediction(cid, cargo_type, lookback_hours)
        except Exception as e:
            results[cid] = {"error": str(e)}
    return results
