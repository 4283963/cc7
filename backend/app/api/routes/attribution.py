from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from ...schemas.container import AttributionRequest, AttributionResult
from ...services.attribution import analyze_temperature_attribution

router = APIRouter(prefix="/api/attribution", tags=["attribution"])


@router.post("/analyze", response_model=AttributionResult)
async def analyze_attribution(request: AttributionRequest):
    try:
        result = analyze_temperature_attribution(
            container_id=request.container_id,
            anomaly_id=request.anomaly_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/container/{container_id}/anomaly/{anomaly_id}")
async def get_attribution_by_anomaly(container_id: str, anomaly_id: int):
    try:
        result = analyze_temperature_attribution(
            container_id=container_id,
            anomaly_id=anomaly_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
