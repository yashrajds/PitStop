"""Pydantic schemas — small payloads for mobile."""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class StationOut(BaseModel):
    id: int
    name: str
    kind: str
    distance: str
    distanceKm: float
    eta: str
    price: str
    availability: str
    rating: float
    address: str
    accent: str = "amber"


class PagedStations(BaseModel):
    items: list[StationOut]
    page: int
    limit: int
    total: int
    synthetic: bool = True


class KpisOut(BaseModel):
    utilization: float
    utilizationDelta: float
    evSessions: str
    fuelVolume: str
    stationCount: int
    series7d: list[float]
    serviceMix: list[dict]
    synthetic: bool = True


class EtlStatusOut(BaseModel):
    extracted: int
    cleaned: int
    rejected: int
    loaded: int
    status: str
    finishedAt: Optional[str] = None
    jobs: list[dict]
    freshnessMin: int = 2
    successRate: float = 99.8
    rowsToday: str = "18.1M"
    synthetic: bool = True


class OlapRequest(BaseModel):
    operation: str  # rollup | drilldown | slice | dice | pivot
    # rollup/drilldown: level e.g. hour->day->month, area->city, service->provider
    from_level: Optional[str] = None
    to_level: Optional[str] = None
    # slice: {dimension, value}; dice: {filters}; pivot: {rows, columns, metric}
    dimension: Optional[str] = None
    value: Optional[str] = None
    filters: Optional[Dict[str, str]] = None
    rows: Optional[str] = None
    columns: Optional[str] = None
    metric: Optional[str] = "sessions"
    limit: int = 50


class OlapResponse(BaseModel):
    operation: str
    explanation: str
    columns: list[str]
    rows: list[dict]
    synthetic: bool = True
