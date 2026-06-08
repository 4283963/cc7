from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ...schemas.container import OrderStatusUpdate, CompensationOrder
from ...services.anomaly_service import (
    detect_anomalies,
    get_anomaly_list,
    create_compensation_order,
    update_order_status,
    get_compensation_orders,
)
from ...db.postgres import get_db

router = APIRouter(prefix="/api/anomaly", tags=["anomaly"])


@router.get("/detect/{container_id}")
async def run_anomaly_detection(container_id: str, lookback_hours: int = 24):
    try:
        anomalies = detect_anomalies(container_id, lookback_hours)
        return {
            "container_id": container_id,
            "anomalies": anomalies,
            "count": len(anomalies),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_anomalies(status: Optional[str] = Query(None)):
    try:
        anomalies = get_anomaly_list(status)
        return {"anomalies": anomalies, "count": len(anomalies)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compensation-order")
async def create_order(
    container_id: str,
    anomaly_id: int,
    customer: str,
    cargo_type: str,
    amount: float = 0.0,
    db: Session = Depends(get_db),
):
    try:
        order = create_compensation_order(db, container_id, anomaly_id, customer, cargo_type, amount)
        return order
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/compensation-order/{order_id}/status")
async def set_order_status(
    order_id: int,
    update: OrderStatusUpdate,
    db: Session = Depends(get_db),
):
    try:
        order = update_order_status(
            db, order_id, update.status, update.amount, update.remark
        )
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        return order
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compensation-orders")
async def list_orders(
    status: Optional[str] = Query(None),
    container_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    try:
        orders = get_compensation_orders(db, status, container_id)
        return {"orders": orders, "count": len(orders)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
