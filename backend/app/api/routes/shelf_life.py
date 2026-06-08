from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from ...services.shelf_life_service import get_shelf_life_prediction
from ...schemas.container import ContainerSensorData

router = APIRouter(prefix="/api/shelf-life", tags=["shelf-life"])


@router.get("/{container_id}")
async def get_shelf_life(
    container_id: str,
    cargo_type: str = Query("默认", description="货物类型"),
    lookback_hours: int = Query(48, ge=1, le=336, description="回溯小时数"),
):
    try:
        result = get_shelf_life_prediction(container_id, cargo_type, lookback_hours)
        return {
            "container_id": container_id,
            "cargo_type": cargo_type,
            "lookback_hours": lookback_hours,
            **result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch")
async def batch_shelf_life(request: dict):
    from ...services.shelf_life_service import get_batch_shelf_life

    container_ids = request.get("container_ids", [])
    cargo_type_map = request.get("cargo_type_map", {})
    lookback_hours = request.get("lookback_hours", 48)

    if not container_ids:
        raise HTTPException(status_code=400, detail="container_ids is required")

    try:
        results = get_batch_shelf_life(container_ids, cargo_type_map, lookback_hours)
        return {
            "lookback_hours": lookback_hours,
            "count": len(results),
            "results": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
