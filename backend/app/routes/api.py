"""Route layer: thin wrappers over services / analytics (routes -> services -> db)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import services
from ..schemas import PagedStations, KpisOut, EtlStatusOut

router = APIRouter()


@router.get("/kpis", response_model=KpisOut)
def kpis(db: Session = Depends(get_db)):
    return services.kpis(db)


@router.get("/stations", response_model=PagedStations)
def stations(kind: str = "All", q: str = "", min_rating: float = 0.0,
             max_distance: float = 20.0, page: int = 1, limit: int = 20,
             db: Session = Depends(get_db)):
    return services.list_stations(db, kind, q, min_rating, max_distance, page, limit)


@router.get("/stations/{sid}")
def station_detail(sid: int, db: Session = Depends(get_db)):
    d = services.station_detail(db, sid)
    return d or {"error": "not found"}


@router.get("/etl/status", response_model=EtlStatusOut)
def etl_status(db: Session = Depends(get_db)):
    return services.etl_status(db)


@router.post("/etl/run")
def etl_run(days: int = 90, db: Session = Depends(get_db)):
    from ..etl import run_etl
    return {**run_etl(db, days=days), "synthetic": True}


@router.get("/analytics/overview")
def overview(db: Session = Depends(get_db)):
    k = services.kpis(db)
    return {"utilization": k["utilization"], "series7d": k["series7d"],
            "serviceMix": k["serviceMix"], "synthetic": True}


@router.post("/olap/query")
def olap(body: dict, db: Session = Depends(get_db)):
    from ..analytics.olap import olap_query
    return olap_query(db, body)


@router.get("/mining/clusters")
def clusters(k: int = 4, db: Session = Depends(get_db)):
    from ..analytics.mining import clusters as c
    return c(db, k)


@router.get("/mining/predictions")
def preds(horizon: str = Query("7D", pattern="^(24H|7D|14D)$"), db: Session = Depends(get_db)):
    from ..analytics.mining import predictions as p
    return p(db, horizon)


@router.get("/mining/anomalies")
def anoms(db: Session = Depends(get_db)):
    from ..analytics.mining import anomalies as a
    return a(db)


@router.get("/mining/opportunities")
def opps(db: Session = Depends(get_db)):
    from ..analytics.mining import opportunities as o
    return o(db)


@router.get("/health")
def health():
    return {"ok": True, "synthetic": True}
