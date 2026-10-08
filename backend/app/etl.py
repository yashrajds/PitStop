"""ETL: Extract -> Clean -> Transform/Validate -> Load.

Tracks extracted / cleaned / rejected / loaded for the mobile ETL screen.
"""
from datetime import datetime
from sqlalchemy.orm import Session
from .models import (DimDate, DimLocation, DimService, DimProvider, DimVehicle,
                     FactServiceUsage, EtlRun)
from .seed import raw_records, PROVIDERS

SERVICE_CAT = {"Fuel": "Energy", "EV Charge": "Energy", "Battery Swap": "Energy",
               "Repair": "Service", "Tyres": "Service", "Car Wash": "Care",
               "Parking": "Space", "Roadside": "Service", "Parts": "Retail"}


def _get_or_create(db: Session, model, defaults: dict, **key):
    obj = db.query(model).filter_by(**key).first()
    if obj:
        return obj, False
    obj = model(**{**key, **defaults})
    db.add(obj)
    db.flush()
    return obj, True


def run_etl(db: Session, days: int = 90) -> dict:
    started = datetime.utcnow()
    extracted = cleaned = rejected = loaded = 0

    # seed provider dimension first (idempotent)
    for (pname, kind, area, addr, rating, km, price) in PROVIDERS:
        p = db.query(DimProvider).filter_by(name=pname).first()
        if not p:
            db.add(DimProvider(name=pname, kind=kind, area=area, address=addr,
                               rating=rating, distance_km=km, price_text=price))
    db.flush()

    for rec in raw_records(days=days):
        extracted += 1
        # ---- clean ----
        area_raw = (rec.get("area") or "").strip()
        if not area_raw:
            rejected += 1
            continue
        # canonical casing (preserves HSR, ITPL-style names)
        canon = {a.lower(): a for a in
                 ["Indiranagar", "Domlur", "Whitefield", "HSR Layout", "Koramangala",
                  "Yelahanka", "Electronic City", "Sarjapur Road", "MG Road", "Bellandur"]}
        area = canon.get(area_raw.lower(), area_raw.title())
        if area_raw != rec.get("area"):
            cleaned += 1
        rec["area"] = area
        # ---- validate ----
        if rec["sessions"] is None or rec["sessions"] < 0:
            rejected += 1
            continue
        if rec["utilization_pct"] < 0 or rec["utilization_pct"] > 100:
            rejected += 1
            continue
        try:
            d = datetime.fromisoformat(rec["date"]).date()
        except Exception:
            rejected += 1
            continue
        # ---- transform + load ----
        date_key = d.year * 10000 + d.month * 100 + d.day
        dd, _ = _get_or_create(db, DimDate, dict(full_date=d, day=d.day, month=d.month,
            year=d.year, day_name=d.strftime("%a"), is_weekend=1 if d.weekday() >= 5 else 0),
            date_key=date_key)
        loc, _ = _get_or_create(db, DimLocation, dict(city="Bengaluru", zone="East" if area in ("Whitefield", "Bellandur") else "South" if area in ("HSR Layout", "Electronic City", "Koramangala") else "North" if area == "Yelahanka" else "Central"), area=area)
        veh, _ = _get_or_create(db, DimVehicle, dict(), vehicle_type=rec["vehicle_type"], fuel_type=rec["fuel_type"])
        svc, _ = _get_or_create(db, DimService, dict(category=SERVICE_CAT.get(rec["service"], "Other")), service_name=rec["service"])
        prov = db.query(DimProvider).filter_by(name=rec["provider"]).first()
        if not prov:
            rejected += 1
            continue
        # avoid duplicate reload of same grain
        exists = db.query(FactServiceUsage).filter_by(date_key=date_key, location_key=loc.location_key,
            vehicle_key=veh.vehicle_key, service_key=svc.service_key, provider_key=prov.provider_key).first()
        if exists:
            continue
        db.add(FactServiceUsage(date_key=date_key, location_key=loc.location_key,
            vehicle_key=veh.vehicle_key, service_key=svc.service_key, provider_key=prov.provider_key,
            sessions=rec["sessions"], quantity=rec["quantity"], revenue=rec["revenue"],
            avg_wait_min=rec["avg_wait_min"], utilization_pct=rec["utilization_pct"], price=rec["price"]))
        loaded += 1
        if loaded % 2000 == 0:
            db.flush()

    db.commit()
    run = EtlRun(extracted=extracted, cleaned=cleaned, rejected=rejected,
                 loaded=loaded, status="success", finished_at=datetime.utcnow())
    db.add(run)
    db.commit()
    return {"extracted": extracted, "cleaned": cleaned, "rejected": rejected,
            "loaded": loaded, "status": "success",
            "finishedAt": run.finished_at.isoformat() if run.finished_at else started.isoformat()}
