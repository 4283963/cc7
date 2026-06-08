from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime
from ...mock.mock_data import (
    generate_mock_trajectory,
    get_mock_active_containers,
    get_mock_anomaly_list,
    get_mock_attribution,
    get_mock_compensation_orders,
    get_container_info,
    MOCK_CONTAINERS,
)
from ...utils.shelf_life import predict_shelf_life_from_trajectory

router = APIRouter(prefix="/api/mock", tags=["mock"])


@router.get("/containers")
async def list_containers():
    return {
        "containers": MOCK_CONTAINERS,
        "count": len(MOCK_CONTAINERS),
    }


@router.get("/container/{container_id}")
async def get_container(container_id: str):
    info = get_container_info(container_id)
    if not info:
        raise HTTPException(status_code=404, detail="Container not found")
    return info


@router.get("/container/{container_id}/trajectory")
async def get_trajectory(
    container_id: str,
    hours: int = Query(168, description="Hours of history to return"),
):
    trajectory = generate_mock_trajectory(container_id, hours)
    return {
        "container_id": container_id,
        "total_points": len(trajectory),
        "trajectory": trajectory,
    }


@router.get("/container/{container_id}/position")
async def get_position(container_id: str):
    trajectory = generate_mock_trajectory(container_id, 1)
    if not trajectory:
        raise HTTPException(status_code=404, detail="Container not found")
    return trajectory[-1]


@router.get("/container/{container_id}/temp-stats")
async def get_temp_stats(container_id: str, hours: int = 24):
    trajectory = generate_mock_trajectory(container_id, hours)
    if not trajectory:
        raise HTTPException(status_code=404, detail="No data found")

    temps = [p["temperature"] for p in trajectory]
    return {
        "min_temp": min(temps),
        "max_temp": max(temps),
        "avg_temp": sum(temps) / len(temps),
        "data_points": len(trajectory),
    }


@router.get("/active/list")
async def list_active_containers():
    containers = get_mock_active_containers()
    return {"containers": containers, "count": len(containers)}


@router.get("/anomalies")
async def list_anomalies(status: Optional[str] = None):
    anomalies = get_mock_anomaly_list()
    if status:
        anomalies = [a for a in anomalies if a["status"] == status]
    return {"anomalies": anomalies, "count": len(anomalies)}


@router.get("/attribution/{container_id}/{anomaly_id}")
async def get_attribution(container_id: str, anomaly_id: int):
    return get_mock_attribution(container_id, anomaly_id)


@router.post("/attribution/analyze")
async def analyze_attribution(request: dict):
    container_id = request.get("container_id")
    anomaly_id = request.get("anomaly_id")
    if not container_id or not anomaly_id:
        raise HTTPException(status_code=400, detail="container_id and anomaly_id are required")
    return get_mock_attribution(container_id, anomaly_id)


@router.get("/compensation-orders")
async def get_orders(
    status: Optional[str] = None,
    container_id: Optional[str] = None,
):
    orders = get_mock_compensation_orders()
    if status:
        orders = [o for o in orders if o["status"] == status]
    if container_id:
        orders = [o for o in orders if o["container_id"] == container_id]
    return {"orders": orders, "count": len(orders)}


@router.put("/compensation-order/{order_id}/status")
async def update_order_status(order_id: int, request: dict):
    orders = get_mock_compensation_orders()
    order = next((o for o in orders if o["id"] == order_id), None)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order["status"] = request.get("status", order["status"])
    if "amount" in request:
        order["amount"] = request["amount"]
    if "remark" in request:
        order["remark"] = request["remark"]
    order["updated_at"] = datetime.now().isoformat()

    return order


@router.get("/shelf-life/{container_id}")
async def get_mock_shelf_life(
    container_id: str,
    lookback_hours: int = Query(48, ge=1, le=336),
):
    container_info = next((c for c in MOCK_CONTAINERS if c["id"] == container_id), None)
    if not container_info:
        raise HTTPException(status_code=404, detail="Container not found")

    cargo_type = container_info.get("cargo", "默认")
    trajectory = generate_mock_trajectory(container_id, lookback_hours)

    result = predict_shelf_life_from_trajectory(trajectory, cargo_type, lookback_hours)

    return {
        "container_id": container_id,
        "cargo_type": cargo_type,
        "lookback_hours": lookback_hours,
        **result,
    }


@router.post("/shelf-life/batch")
async def batch_mock_shelf_life(request: dict):
    container_ids = request.get("container_ids", [])
    lookback_hours = request.get("lookback_hours", 48)

    if not container_ids:
        raise HTTPException(status_code=400, detail="container_ids is required")

    results = {}
    for cid in container_ids:
        container_info = next((c for c in MOCK_CONTAINERS if c["id"] == cid), None)
        if not container_info:
            results[cid] = {"error": "Container not found"}
            continue

        cargo_type = container_info.get("cargo", "默认")
        trajectory = generate_mock_trajectory(cid, lookback_hours)
        result = predict_shelf_life_from_trajectory(trajectory, cargo_type, lookback_hours)
        results[cid] = result

    return {
        "lookback_hours": lookback_hours,
        "count": len(results),
        "results": results,
    }
