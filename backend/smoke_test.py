"""Smoke test: build DB, run ETL, hit key queries without a server."""
from app.database import Base, engine, SessionLocal
from app.etl import run_etl
from app import services
from app.analytics.olap import olap_query
from app.analytics import mining

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
db = SessionLocal()
stats = run_etl(db, days=30)
print("ETL:", stats)
assert stats["loaded"] > 0 and stats["extracted"] >= stats["loaded"]
print("KPIs:", services.kpis(db)["utilization"])
print("Stations:", services.list_stations(db, limit=3)["total"])
print("OLAP rollup:", olap_query(db, {"operation": "rollup", "to_level": "month"})["rows"][:1])
print("Clusters:", len(mining.clusters(db)["clusters"]))
print("Predictions:", len(mining.predictions(db)["forecast"]))
print("Anomalies:", len(mining.anomalies(db)["anomalies"]))
print("Opportunities:", len(mining.opportunities(db)["opportunities"]))
print("ALL OK (synthetic demo)")
