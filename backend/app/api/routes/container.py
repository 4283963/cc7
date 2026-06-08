from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta
from typing import List, Optional
from ...schemas.container import ContainerSensorData, TrajectoryPoint
from ...services.sensor_service import (
    insert_sensor_data,
    get_trajectory,
    get_current_position,
    get_all_active_containers,
    get_temperature_stats,
)

router = APIRouter(prefix="/api/container", tags=["container"])


@router.post("/sensor-data")
async def receive_sensor_data(data: ContainerSensorData):
    try:
        insert_sensor_data(data)
        return {"status": "success", "message": "Sensor data received"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{container_id}/trajectory")
async def get_container_trajectory(
    container_id: str,
    start_time: Optional[str] = Query(None),
    end_time: Optional[str] = Query(None),
):
    try:
        start_dt = datetime.fromisoformat(start_time) if start_time else None
        end_dt = datetime.fromisoformat(end_time) if end_time else None

        trajectory = get_trajectory(container_id, start_dt, end_dt)
        return {
            "container_id": container_id,
            "total_points": len(trajectory),
            "trajectory": trajectory,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{container_id}/position")
async def get_container_position(container_id: str):
    try:
        position = get_current_position(container_id)
        if not position:
            raise HTTPException(status_code=404, detail="Container not found")
        return position
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{container_id}/temp-stats")
async def get_temp_stats(container_id: str, hours: int = 24):
    try:
        stats = get_temperature_stats(container_id, hours)
        if not stats:
            raise HTTPException(status_code=404, detail="No data found")
        return stats
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/active/list")
async def list_active_containers():
    try:
        containers = get_all_active_containers()
        return {"containers": containers, "count": len(containers)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
