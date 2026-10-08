"""PITSTOP backend — FastAPI + Star Schema warehouse + OLAP + data mining (synthetic demo)."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routes.api import router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="PITSTOP API", version="1.0.0",
              description="Vehicle infrastructure & mobility intelligence (synthetic demo data).")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {"name": "PITSTOP API", "docs": "/docs", "pipeline": "RAW -> ETL -> WAREHOUSE -> OLAP -> MINING -> INSIGHTS",
            "synthetic": True}


@app.get("/health")
def health():
    return {"ok": True}
