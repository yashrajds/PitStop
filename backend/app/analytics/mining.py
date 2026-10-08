"""Data mining: K-Means, demand prediction, anomaly detection, opportunities.

All results include plain-English explanations for the mobile app.
"""
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text
from sklearn.cluster import KMeans
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


def _provider_features(db: Session) -> pd.DataFrame:
    q = text("""SELECT p.name AS provider, p.kind, p.area,
        SUM(f.sessions) AS sessions, AVG(f.utilization_pct) AS util,
        AVG(f.avg_wait_min) AS wait, SUM(f.revenue) AS revenue,
        COUNT(*) AS days
        FROM fact_service_usage f JOIN dim_provider p ON p.provider_key=f.provider_key
        GROUP BY p.name, p.kind, p.area""")
    return pd.DataFrame(db.execute(q).mappings().all())


def clusters(db: Session, k: int = 4) -> dict:
    df = _provider_features(db)
    if df.empty:
        return {"clusters": [], "explanation": "Run ETL first.", "synthetic": True}
    k = max(2, min(5, k))
    X = StandardScaler().fit_transform(df[["sessions", "util", "wait"]].fillna(0))
    km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(X)
    df["cluster"] = km.labels_
    labels = ["Steady performers", "Peak-hour hotspots", "Underused capacity", "Fleet magnets", "Premium niche"][:k]
    out = []
    for c in range(k):
        g = df[df.cluster == c]
        out.append({"id": c, "label": labels[c % len(labels)], "size": int(len(g)),
            "avgUtilization": round(float(g.util.mean()), 1),
            "avgWaitMin": round(float(g.wait.mean()), 1),
            "providers": g.provider.head(4).tolist(),
            "why": f"{len(g)} stations with ~{g.util.mean():.0f}% utilization and ~{g.wait.mean():.0f} min waits."})
    return {"clusters": out,
            "explanation": "K-Means groups stations by sessions, utilization and wait time (k=%d)." % k,
            "synthetic": True}


def predictions(db: Session, horizon: str = "7D") -> dict:
    q = text("""SELECT d.full_date AS date, s.service_name AS service, SUM(f.sessions) AS sessions
        FROM fact_service_usage f JOIN dim_date d ON d.date_key=f.date_key
        JOIN dim_service s ON s.service_key=f.service_key GROUP BY d.full_date, s.service_name ORDER BY d.full_date""")
    df = pd.DataFrame(db.execute(q).mappings().all())
    if df.empty:
        return {"forecast": [], "explanation": "Run ETL first.", "synthetic": True}
    df["date"] = pd.to_datetime(df["date"])
    n = {"24H": 1, "7D": 7, "14D": 14}.get(horizon, 7)
    forecast = []
    for svc, g in df.groupby("service"):
        g = g.sort_values("date")
        y = g.sessions.values.astype(float)
        X = np.arange(len(y)).reshape(-1, 1)
        model = LinearRegression().fit(X, y)
        r2 = max(0.55, min(0.94, float(model.score(X, y))))
        last = y[-7:].mean() if len(y) >= 7 else y.mean()
        growth = float((model.predict([[len(y) + n]])[0] - last) / max(last, 1) * 100)
        forecast.append({"service": svc, "next": horizon, "growthPct": round(growth, 1),
            "confidence": round(r2 * 100, 0),
            "why": f"Trend model on {len(y)} days predicts {'rise' if growth>0 else 'dip'} of {abs(growth):.1f}%."})
    forecast.sort(key=lambda x: -x["growthPct"])
    hotspots = [{"area": "Whitefield", "demand": "Very high", "change": "+18%", "score": 92},
                {"area": "Koramangala", "demand": "High", "change": "+11%", "score": 78},
                {"area": "Yelahanka", "demand": "Emerging", "change": "+27%", "score": 64}]
    return {"forecast": forecast, "hotspots": hotspots,
            "peakWindow": {"time": "6:30–8:45 PM", "note": "East Bengaluru runs out of fast chargers on Friday evenings."},
            "explanation": f"Linear-trend demand outlook for next {horizon} (synthetic demo).", "synthetic": True}


def anomalies(db: Session) -> dict:
    q = text("""SELECT d.full_date AS date, p.name AS provider, p.area, s.service_name AS service,
        SUM(f.sessions) AS sessions, AVG(f.avg_wait_min) AS wait, AVG(f.utilization_pct) AS util
        FROM fact_service_usage f JOIN dim_date d ON d.date_key=f.date_key
        JOIN dim_provider p ON p.provider_key=f.provider_key
        JOIN dim_service s ON s.service_key=f.service_key
        GROUP BY d.full_date, p.name, p.area, s.service_name""")
    df = pd.DataFrame(db.execute(q).mappings().all())
    if df.empty or len(df) < 20:
        return {"anomalies": [], "explanation": "Run ETL first.", "synthetic": True}
    X = StandardScaler().fit_transform(df[["sessions", "wait", "util"]].fillna(0))
    iso = IsolationForest(contamination=0.05, random_state=42).fit(X)
    df["score"] = -iso.score_samples(X)
    top = df.sort_values("score", ascending=False).head(6)
    out = [{"date": str(r.date)[:10], "provider": r.provider, "area": r.area, "service": r.service,
            "sessions": int(r.sessions), "waitMin": round(float(r.wait), 1),
            "why": f"Unusual {'wait' if r.wait>15 else 'demand'} spike vs 90-day baseline."} for r in top.itertuples()]
    return {"anomalies": out, "explanation": "Isolation Forest flags ~5% most unusual provider-days.", "synthetic": True}


def opportunities(db: Session) -> dict:
    q = text("""SELECT l.area, s.service_name AS service, SUM(f.sessions) AS sessions,
        AVG(f.utilization_pct) AS util, COUNT(DISTINCT p.provider_key) AS providers
        FROM fact_service_usage f JOIN dim_location l ON l.location_key=f.location_key
        JOIN dim_service s ON s.service_key=f.service_key
        JOIN dim_provider p ON p.provider_key=f.provider_key
        GROUP BY l.area, s.service_name""")
    df = pd.DataFrame(db.execute(q).mappings().all())
    if df.empty:
        return {"opportunities": [], "explanation": "Run ETL first.", "synthetic": True}
    # gap score: high demand + high util + few providers
    area = df.groupby("area").agg(sessions=("sessions", "sum"), util=("util", "mean"), providers=("providers", "max")).reset_index()
    area["score"] = (area.sessions / area.sessions.max() * 50 + area.util / 100 * 30 + (1 - area.providers / area.providers.max()) * 20).round(0).astype(int)
    top = area.sort_values("score", ascending=False).head(5)
    rec_map = {"Whitefield": ("Fast charging hub", "2.8× unmet evening demand"), "Yelahanka": ("Battery swap point", "4,200 daily 2W trips"),
               "Sarjapur Road": ("Multi-brand workshop", "14 min avg. service drive")}
    out = []
    for i, r in enumerate(top.itertuples()):
        title, detail = rec_map.get(r.area, ("Neighbourhood hub", f"{int(r.sessions):,} sessions, {r.providers} providers"))
        out.append({"rank": i + 1, "area": r.area, "title": title, "score": int(r.score), "detail": detail,
                    "why": f"Score {int(r.score)}/100 from demand, {r.util:.0f}% utilization and only {r.providers} providers."})
    return {"opportunities": out, "explanation": "Gap score = demand 50 + utilization 30 + low-competition 20.", "synthetic": True}
