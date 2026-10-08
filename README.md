# PITSTOP — Vehicle Infrastructure & Mobility Intelligence

PITSTOP is an **Android mobility-intelligence app** (React + Capacitor) backed by a
**Python data-warehouse pipeline**. It covers fuel stations, EV charging, battery
swapping, repairs, tyre shops, car wash, parking, roadside assistance and spare parts —
and uses historical data to analyze demand, utilization, pricing, peak periods, service
performance and infrastructure gaps.

> **Demo data:** every number served by the backend is realistic **synthetic demo data**
> (labelled `synthetic: true` in API payloads and badged in the app UI).

## The DWM pipeline

```
RAW DATA → ETL → DATA WAREHOUSE → OLAP → DATA MINING → INSIGHTS (mobile app)
```

| Stage | What it does |
|---|---|
| **Raw data** | `backend/app/seed.py` generates 90 days of Bengaluru service-usage records (evening peaks, weekend EV surge, ~3% dirty rows) |
| **ETL** | `backend/app/etl.py` — extract → clean → validate → load; tracks `extracted / cleaned / rejected / loaded` per run |
| **Warehouse** | Star schema in `backend/app/models.py`: `Fact_Service_Usage` + `Dim_Date`, `Dim_Location`, `Dim_Vehicle`, `Dim_Service`, `Dim_Provider` (SQLite by default, PostgreSQL via `DATABASE_URL`) |
| **OLAP** | `backend/app/analytics/olap.py` — roll-up (hour→day→month, area→city, provider→service), drill-down, slice, dice, pivot |
| **Data mining** | `backend/app/analytics/mining.py` — K-Means utilization clusters, demand prediction, IsolationForest anomaly detection, infrastructure-gap scoring — all with plain-English explanations |
| **App** | `src/` — mobile UI with live KPIs, nearby search, station details, insights, predictions, opportunities and ETL status |

## Repo layout

```
PitStop/
├── src/                  # React + Tailwind mobile app (bundled into the APK)
│   ├── App.tsx           # all screens: home, nearby, details, insights, mining, ETL
│   ├── api.ts            # backend client (timeouts, pagination, offline fallback)
│   └── data.ts           # cached fallback data for offline mode
├── backend/              # FastAPI + SQLAlchemy + pandas + scikit-learn
│   └── app/
│       ├── routes/       # REST layer (routes → services → database)
│       ├── analytics/    # OLAP + data-mining modules
│       ├── etl.py seed.py models.py services.py schemas.py
├── android/              # Capacitor native shell (com.pitstop.app) — open in Android Studio
├── capacitor.config.ts
└── .env.example          # VITE_API_URL
```

## Run the backend

```bash
cd backend
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --reload --port 8000
# load the warehouse, then explore http://localhost:8000/docs
curl -X POST http://localhost:8000/api/etl/run
```

Key endpoints: `GET /api/kpis`, `GET /api/stations`, `GET /api/etl/status`,
`POST /api/etl/run`, `POST /api/olap/query`, `GET /api/mining/clusters`,
`GET /api/mining/predictions?horizon=7D`, `GET /api/mining/anomalies`,
`GET /api/mining/opportunities`.

Set `DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/pitstop` in a `.env`
file to use PostgreSQL instead of the default local SQLite `pitstop.db`.

## Run the app

**Option A — native APK (recommended):**
1. `npm install`, then `npm run android` (builds the web bundle into `android/`)
2. Open the `android/` folder in **Android Studio**
3. Select a device (e.g. Medium Phone) and press **Run ▶**
4. For live data, bridge the API: `adb reverse tcp:8000 tcp:8000`

> Android Studio note: if Gradle sync complains about the Java version, go to
> **Settings → Build Tools → Gradle → Gradle JDK** and pick **17 or 21**
> (the bundled JBR may be too new for Gradle 8.14).

**Option B — browser dev mode:**

```bash
npm install
npm run dev        # http://localhost:8443
# VITE_API_URL=http://localhost:8000/api (see .env.example)
```

Without the backend running, the app degrades gracefully to cached demo data and
shows an "offline · cached demo" badge with retry.

## Tech stack

- **Frontend:** React 19, Tailwind CSS 4, Capacitor 8 (native Android shell)
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL/SQLite, pandas, NumPy, scikit-learn
- **Project type:** Data Warehousing & Mining (DWM) college project
