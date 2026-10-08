"""Service layer: small mobile payloads from the warehouse."""
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from .models import DimProvider, EtlRun

ACCENT = {"Fuel": "blue", "EV Charge": "amber", "Battery Swap": "amber", "Repair": "green",
          "Tyres": "green", "Car Wash": "blue", "Parking": "amber", "Roadside": "green", "Parts": "blue"}


def kpis(db: Session) -> dict:
    r = db.execute(text("""SELECT AVG(utilization_pct) u, SUM(CASE WHEN s.service_name='EV Charge' THEN sessions ELSE 0 END) ev,
        SUM(CASE WHEN s.service_name='Fuel' THEN quantity ELSE 0 END) fuel
        FROM fact_service_usage f JOIN dim_service s ON s.service_key=f.service_key""")).mappings().first()
    n = db.query(func.count(DimProvider.provider_key)).scalar() or 0
    q = text("""SELECT d.full_date dt, AVG(f.utilization_pct) u FROM fact_service_usage f
        JOIN dim_date d ON d.date_key=f.date_key GROUP BY d.full_date ORDER BY d.full_date DESC LIMIT 7""")
    rows = list(db.execute(q).mappings().all())[::-1]
    series = [round(float(x["u"]), 1) for x in rows] or [62.1, 64.0, 63.2, 66.8, 68.1, 65.4, 67.4]
    u = round(float(r["u"] or 67.4), 1)
    return {"utilization": u, "utilizationDelta": 8.2,
            "evSessions": f"{(r['ev'] or 18200)/1000:.1f}K",
            "fuelVolume": f"{(r['fuel'] or 2400000)/1000000:.1f}M L",
            "stationCount": n or 14, "series7d": series,
            "serviceMix": [{"label": "Fuel", "pct": 38}, {"label": "EV charge", "pct": 27},
                           {"label": "Service", "pct": 21}, {"label": "Other", "pct": 14}],
            "synthetic": True}


def list_stations(db: Session, kind=None, q=None, min_rating=0.0, max_distance=20.0, page=1, limit=20):
    query = db.query(DimProvider)
    if kind and kind != "All":
        query = query.filter(DimProvider.kind == kind)
    if min_rating:
        query = query.filter(DimProvider.rating >= min_rating)
    query = query.filter(DimProvider.distance_km <= max_distance)
    if q:
        query = query.filter(DimProvider.name.ilike(f"%{q}%"))
    total = query.count()
    rows = query.order_by(DimProvider.distance_km).offset((page - 1) * limit).limit(limit).all()
    items = [{"id": p.provider_key, "name": p.name, "kind": p.kind,
              "distance": f"{p.distance_km:.1f} km", "distanceKm": p.distance_km,
              "eta": f"{max(2, int(p.distance_km*3))} min", "price": p.price_text,
              "availability": "Open now · live", "rating": p.rating, "address": p.address,
              "accent": ACCENT.get(p.kind, "amber")} for p in rows]
    return {"items": items, "page": page, "limit": limit, "total": total, "synthetic": True}


def station_detail(db: Session, sid: int):
    p = db.query(DimProvider).filter_by(provider_key=sid).first()
    if not p:
        return None
    stats = db.execute(text("""SELECT AVG(utilization_pct) u, AVG(avg_wait_min) w, SUM(sessions) s
        FROM fact_service_usage WHERE provider_key=:k"""), {"k": sid}).mappings().first()
    return {"id": p.provider_key, "name": p.name, "kind": p.kind,
            "distance": f"{p.distance_km:.1f} km", "distanceKm": p.distance_km,
            "eta": f"{max(2, int(p.distance_km*3))} min", "price": p.price_text,
            "availability": f"{round((stats['u'] or 60)/100*6)} of 6 available",
            "rating": p.rating, "address": p.address, "accent": ACCENT.get(p.kind, "amber"),
            "utilization": round(float(stats["u"] or 60), 1),
            "avgWaitMin": round(float(stats["w"] or 6), 1),
            "totalSessions": int(stats["s"] or 0),
            "popularTimes": [26, 34, 42, 68, 82, 62, 38, 28, 24, 20, 26, 45],
            "synthetic": True}


def etl_status(db: Session) -> dict:
    run = db.query(EtlRun).order_by(EtlRun.id.desc()).first()
    jobs = [{"name": "Station telemetry", "rows": "12.8M", "status": "Healthy", "updated": "2m ago"},
            {"name": "Mobility demand", "rows": "4.2M", "status": "Healthy", "updated": "8m ago"},
            {"name": "Pricing signals", "rows": "862K",
             "status": "Delayed" if not run else "Healthy", "updated": "34m ago"},
            {"name": "Service registry", "rows": "128K", "status": "Healthy", "updated": "1h ago"}]
    if not run:
        return {"extracted": 0, "cleaned": 0, "rejected": 0, "loaded": 0, "status": "never_run",
                "finishedAt": None, "jobs": jobs, "synthetic": True}
    return {"extracted": run.extracted, "cleaned": run.cleaned, "rejected": run.rejected,
            "loaded": run.loaded, "status": run.status,
            "finishedAt": run.finished_at.isoformat() if run.finished_at else None,
            "jobs": jobs, "synthetic": True}
