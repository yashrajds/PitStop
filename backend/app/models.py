"""Star schema: Fact_Service_Usage + 5 dimensions + ETL run log.

Fact grain: one row = one provider-day-service-vehicle aggregate (synthetic demo).
"""
from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, func
from .database import Base


class DimDate(Base):
    __tablename__ = "dim_date"
    date_key = Column(Integer, primary_key=True)          # YYYYMMDD
    full_date = Column(Date, nullable=False, unique=True)
    day = Column(Integer)
    month = Column(Integer)
    year = Column(Integer)
    hour = Column(Integer, default=0)
    day_name = Column(String(16))
    is_weekend = Column(Integer, default=0)


class DimLocation(Base):
    __tablename__ = "dim_location"
    location_key = Column(Integer, primary_key=True, autoincrement=True)
    area = Column(String(64), index=True)
    city = Column(String(64), default="Bengaluru")
    zone = Column(String(32))


class DimVehicle(Base):
    __tablename__ = "dim_vehicle"
    vehicle_key = Column(Integer, primary_key=True, autoincrement=True)
    vehicle_type = Column(String(32), index=True)   # 2W, Car, SUV, Fleet, Bus
    fuel_type = Column(String(32))                  # Petrol, Diesel, Electric


class DimService(Base):
    __tablename__ = "dim_service"
    service_key = Column(Integer, primary_key=True, autoincrement=True)
    service_name = Column(String(32), index=True)   # Fuel, EV Charge, ...
    category = Column(String(32))


class DimProvider(Base):
    __tablename__ = "dim_provider"
    provider_key = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128))
    kind = Column(String(32), index=True)
    area = Column(String(64), index=True)
    address = Column(String(256))
    rating = Column(Float, default=4.5)
    lat = Column(Float, default=0.0)
    lon = Column(Float, default=0.0)
    distance_km = Column(Float, default=1.0)
    price_text = Column(String(64), default="")


class FactServiceUsage(Base):
    __tablename__ = "fact_service_usage"
    fact_id = Column(Integer, primary_key=True, autoincrement=True)
    date_key = Column(Integer, ForeignKey("dim_date.date_key"), index=True)
    location_key = Column(Integer, ForeignKey("dim_location.location_key"), index=True)
    vehicle_key = Column(Integer, ForeignKey("dim_vehicle.vehicle_key"), index=True)
    service_key = Column(Integer, ForeignKey("dim_service.service_key"), index=True)
    provider_key = Column(Integer, ForeignKey("dim_provider.provider_key"), index=True)
    sessions = Column(Integer, default=0)
    quantity = Column(Float, default=0.0)        # litres / kWh / jobs
    revenue = Column(Float, default=0.0)
    avg_wait_min = Column(Float, default=0.0)
    utilization_pct = Column(Float, default=0.0)
    price = Column(Float, default=0.0)


class EtlRun(Base):
    __tablename__ = "etl_run"
    id = Column(Integer, primary_key=True, autoincrement=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True), onupdate=func.now())
    extracted = Column(Integer, default=0)
    cleaned = Column(Integer, default=0)
    rejected = Column(Integer, default=0)
    loaded = Column(Integer, default=0)
    status = Column(String(32), default="success")
    note = Column(String(256), default="synthetic demo data")
