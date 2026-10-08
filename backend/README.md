# PITSTOP backend (DWM college project)

RAW DATA → ETL → DATA WAREHOUSE → OLAP → DATA MINING → INSIGHTS. All demo data is **synthetic**.

## Quick start

```bash
cd backend
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --reload --port 8000
# first run: POST http://localhost:8000/api/etl/run  (loads 90 days synthetic warehouse)
# docs: http://localhost:8000/docs
```

PostgreSQL (optional): set `DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/pitstop` in `.env`.
Default is local SQLite `pitstop.db` — zero config for demo.

## Modules (routes → schemas → services → database → analytics)

- `app/routes/api.py` — REST: kpis, stations, etl, analytics, olap, mining
- `app/schemas.py` — mobile-sized Pydantic payloads
- `app/services.py` — warehouse queries
- `app/database.py`, `app/models.py` — Star Schema (`Fact_Service_Usage`, `Dim_Date/Location/Vehicle/Service/Provider`, `EtlRun`)
- `app/seed.py` — synthetic Bengaluru data generator
- `app/etl.py` — extract/clean/validate/load with extracted/cleaned/rejected/loaded counts
- `app/analytics/olap.py` — roll-up, drill-down, slice, dice, pivot
- `app/analytics/mining.py` — K-Means, demand prediction, IsolationForest anomalies, gap opportunities
```

## Demo flow

1. `POST /api/etl/run` → note extracted/cleaned/rejected/loaded
2. `GET /api/kpis`, `GET /api/stations` → home + nearby
3. `POST /api/olap/query` `{"operation":"rollup","to_level":"month"}` etc.
4. `GET /api/mining/clusters`, `/predictions?horizon=7D`, `/anomalies`, `/opportunities`
