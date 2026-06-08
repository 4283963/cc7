from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class ContainerSensorData(BaseModel):
    container_id: str
    timestamp: datetime
    temperature: float
    humidity: float
    latitude: float
    longitude: float
    compressor_status: bool
    solar_intensity: Optional[float] = None


class TrajectoryPoint(BaseModel):
    timestamp: datetime
    latitude: float
    longitude: float
    temperature: float
    humidity: float


class AnomalyEvent(BaseModel):
    id: Optional[int] = None
    container_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    max_temperature: float
    severity: str
    status: str = "active"


class AttributionRequest(BaseModel):
    container_id: str
    anomaly_id: int


class AttributionSegment(BaseModel):
    time_start: datetime
    time_end: datetime
    lat_start: float
    lon_start: float
    lat_end: float
    lon_end: float
    avg_temperature: float
    temp_rise: float
    avg_solar_intensity: float
    compressor_off_ratio: float
    sea_area: str
    cause_type: str
    confidence: float


class AttributionResult(BaseModel):
    anomaly_id: int
    container_id: str
    total_segments: int
    primary_cause: str
    primary_sea_area: str
    segments: List[AttributionSegment]


class CompensationOrder(BaseModel):
    id: Optional[int] = None
    order_no: str
    container_id: str
    anomaly_id: int
    customer: str
    cargo_type: str
    status: str
    amount: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class OrderStatusUpdate(BaseModel):
    status: str
    amount: Optional[float] = None
    remark: Optional[str] = None
