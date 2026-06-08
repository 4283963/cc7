from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from ..db.clickhouse import get_clickhouse
from ..db.postgres import get_db
from ..schemas.container import AnomalyEvent, CompensationOrder
from ..models.container import CompensationOrder as CompensationOrderModel


SPIKE_THRESHOLD = 8.0
HIGH_TEMP_THRESHOLD = -10.0


def detect_anomalies(container_id: str, lookback_hours: int = 24) -> List[dict]:
    client = get_clickhouse()
    query = """
        SELECT
            timestamp,
            temperature,
            latitude,
            longitude,
            compressor_status
        FROM sensor_logs
        WHERE container_id = %(container_id)s
          AND timestamp >= now() - INTERVAL %(lookback_hours)s HOUR
        ORDER BY timestamp ASC
    """
    rows = client.execute(
        query, {"container_id": container_id, "lookback_hours": lookback_hours}
    )

    anomalies = []
    if len(rows) < 2:
        return anomalies

    baseline_temp = rows[0][1]
    in_anomaly = False
    anomaly_start = None
    max_temp = baseline_temp

    for i, row in enumerate(rows):
        ts, temp, lat, lon, comp = row

        if i > 0:
            prev_temp = rows[i - 1][1]
            temp_spike = temp - prev_temp

            if temp_spike >= SPIKE_THRESHOLD or temp >= HIGH_TEMP_THRESHOLD:
                if not in_anomaly:
                    in_anomaly = True
                    anomaly_start = ts
                    max_temp = temp
                else:
                    max_temp = max(max_temp, temp)
            elif in_anomaly and temp < HIGH_TEMP_THRESHOLD and temp_spike < 1.0:
                if in_anomaly:
                    severity = _calc_severity(max_temp, temp - baseline_temp)
                    anomalies.append(
                        {
                            "container_id": container_id,
                            "start_time": anomaly_start,
                            "end_time": ts,
                            "max_temperature": max_temp,
                            "severity": severity,
                            "status": "detected",
                        }
                    )
                    in_anomaly = False
                    max_temp = 0

    if in_anomaly:
        severity = _calc_severity(max_temp, max_temp - baseline_temp)
        anomalies.append(
            {
                "container_id": container_id,
                "start_time": anomaly_start,
                "end_time": rows[-1][0],
                "max_temperature": max_temp,
                "severity": severity,
                "status": "ongoing",
            }
        )

    return anomalies


def _calc_severity(max_temp: float, temp_rise: float) -> str:
    if temp_rise >= 15 or max_temp >= 0:
        return "critical"
    elif temp_rise >= 10 or max_temp >= -5:
        return "high"
    elif temp_rise >= 5 or max_temp >= -10:
        return "medium"
    return "low"


def get_anomaly_list(status: Optional[str] = None) -> List[dict]:
    client = get_clickhouse()
    query = """
        SELECT
            id,
            container_id,
            start_time,
            end_time,
            max_temperature,
            severity,
            status
        FROM anomaly_events
    """
    params = {}
    if status:
        query += " WHERE status = %(status)s"
        params["status"] = status
    query += " ORDER BY start_time DESC LIMIT 100"

    rows = client.execute(query, params)
    return [
        {
            "id": row[0],
            "container_id": row[1],
            "start_time": row[2],
            "end_time": row[3],
            "max_temperature": row[4],
            "severity": row[5],
            "status": row[6],
        }
        for row in rows
    ]


def create_compensation_order(
    db: Session,
    container_id: str,
    anomaly_id: int,
    customer: str,
    cargo_type: str,
    amount: float = 0.0,
) -> CompensationOrder:
    import uuid

    order_no = f"COMP-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

    db_order = CompensationOrderModel(
        order_no=order_no,
        container_id=container_id,
        anomaly_id=anomaly_id,
        customer=customer,
        cargo_type=cargo_type,
        status="pending",
        amount=amount,
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order


def update_order_status(
    db: Session,
    order_id: int,
    status: str,
    amount: Optional[float] = None,
    remark: Optional[str] = None,
) -> Optional[CompensationOrderModel]:
    order = db.query(CompensationOrderModel).filter(CompensationOrderModel.id == order_id).first()
    if not order:
        return None

    order.status = status
    if amount is not None:
        order.amount = amount
    if remark:
        order.remark = remark
    order.updated_at = datetime.now()

    db.commit()
    db.refresh(order)
    return order


def get_compensation_orders(
    db: Session, status: Optional[str] = None, container_id: Optional[str] = None
) -> List[CompensationOrderModel]:
    query = db.query(CompensationOrderModel)
    if status:
        query = query.filter(CompensationOrderModel.status == status)
    if container_id:
        query = query.filter(CompensationOrderModel.container_id == container_id)
    return query.order_by(CompensationOrderModel.created_at.desc()).all()
