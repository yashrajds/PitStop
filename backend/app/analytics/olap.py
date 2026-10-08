"""OLAP over the star schema using pandas (mobile-sized payloads).

Operations: roll-up, drill-down, slice, dice, pivot.
"""
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text

METRICS = {"sessions", "revenue", "quantity", "avg_wait_min", "utilization_pct"}


def _frame(db: Session, limit_rows: int = 20000) -> pd.DataFrame:
    q = text("""SELECT f.sessions, f.quantity, f.revenue, f.avg_wait_min, f.utilization_pct,
        d.full_date AS date, d.month AS month, d.day_name AS day,
        l.area AS area, l.city AS city, l.zone AS zone,
        v.vehicle_type AS vehicle_type, v.fuel_type AS fuel_type,
        s.service_name AS service, s.category AS category,
        p.name AS provider, p.kind AS kind
        FROM fact_service_usage f
        JOIN dim_date d ON d.date_key=f.date_key
        JOIN dim_location l ON l.location_key=f.location_key
        JOIN dim_vehicle v ON v.vehicle_key=f.vehicle_key
        JOIN dim_service s ON s.service_key=f.service_key
        JOIN dim_provider p ON p.provider_key=f.provider_key
        LIMIT :lim""")
    rows = db.execute(q, {"lim": limit_rows}).mappings().all()
    df = pd.DataFrame(rows)
    if df.empty:
        return df
    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.strftime("%Y-%m")
    return df


def olap_query(db: Session, req: dict) -> dict:
    op = req.get("operation", "slice")
    metric = req.get("metric", "sessions")
    if metric not in METRICS:
        metric = "sessions"
    df = _frame(db)
    if df.empty:
        return {"operation": op, "explanation": "Warehouse is empty. Run ETL first (synthetic demo).",
                "columns": [], "rows": [], "synthetic": True}
    agg = "mean" if metric in ("avg_wait_min", "utilization_pct") else "sum"

    def agg_df(g: pd.DataFrame, by: list):
        return g.groupby(by, as_index=False)[metric].agg(agg).sort_values(metric, ascending=False)

    if op == "rollup":
        # e.g. day->month, area->city, provider->service
        frm, to = req.get("from_level", "day"), req.get("to_level", "month")
        mapping = {"day": "day", "area": "area", "provider": "provider", "vehicle_type": "vehicle_type"}
        tmap = {"month": "month", "city": "city", "service": "service", "service_name": "service"}
        col = tmap.get(to, to if to in df.columns else "month")
        out = agg_df(df, [col]).head(req.get("limit", 50))
        exp = f"Roll-up aggregates {metric} from {frm} level to {to} level (e.g. hour → day → month)."
    elif op == "drilldown":
        frm, to = req.get("from_level", "month"), req.get("to_level", "day")
        col = to if to in df.columns else "day"
        filt = req.get("filters") or {}
        dff = df
        for k, v in filt.items():
            if k in dff.columns:
                dff = dff[dff[k].astype(str) == str(v)]
        out = agg_df(dff, [col]).head(req.get("limit", 50))
        exp = f"Drill-down breaks {frm} totals into {to} detail" + (f" for {filt}." if filt else ".")
    elif op == "slice":
        dim, val = req.get("dimension", "service"), req.get("value", "EV Charge")
        col = dim if dim in df.columns else "service"
        dff = df[df[col].astype(str) == str(val)]
        out = agg_df(dff, ["area"] if col != "area" else ["provider"]).head(req.get("limit", 50))
        exp = f"Slice fixes {col} = {val} and shows {metric} across areas/providers."
    elif op == "dice":
        filt = req.get("filters") or {"service": "EV Charge", "zone": "East"}
        dff = df
        for k, v in filt.items():
            if k in dff.columns:
                dff = dff[dff[k].astype(str) == str(v)]
        by = ["area", "service"] if len(filt) else ["service"]
        by = [c for c in by if c in dff.columns] or ["service"]
        out = agg_df(dff, by).head(req.get("limit", 50))
        exp = f"Dice selects a sub-cube with filters {filt}."
    else:  # pivot
        r, c = req.get("rows", "service"), req.get("columns", "zone")
        r = r if r in df.columns else "service"
        c = c if c in df.columns else "zone"
        piv = pd.pivot_table(df, index=r, columns=c, values=metric, aggfunc=agg, fill_value=0).reset_index()
        piv.columns = [str(x) for x in piv.columns]
        rows = piv.head(req.get("limit", 50)).to_dict("records")
        return {"operation": "pivot", "explanation": f"Pivot: rows={r}, columns={c}, metric={metric} ({agg}).",
                "columns": list(piv.columns), "rows": rows, "synthetic": True}
    rows = out.to_dict("records")
    cols = list(out.columns)
    return {"operation": op, "explanation": exp, "columns": cols, "rows": rows, "synthetic": True}
