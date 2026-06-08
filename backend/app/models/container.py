from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from ..db.postgres import Base


class Container(Base):
    __tablename__ = "containers"

    id = Column(Integer, primary_key=True, index=True)
    container_id = Column(String(50), unique=True, index=True, nullable=False)
    cargo_type = Column(String(100))
    customer = Column(String(100))
    origin_port = Column(String(100))
    destination_port = Column(String(100))
    status = Column(String(50), default="in_transit")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CompensationOrder(Base):
    __tablename__ = "compensation_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(50), unique=True, index=True, nullable=False)
    container_id = Column(String(50), index=True, nullable=False)
    anomaly_id = Column(Integer, index=True, nullable=False)
    customer = Column(String(100))
    cargo_type = Column(String(100))
    status = Column(String(50), default="pending")
    amount = Column(Float, nullable=True)
    remark = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
