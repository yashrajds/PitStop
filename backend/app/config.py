"""Central configuration. SQLite by default, PostgreSQL when DATABASE_URL is set."""
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").strip() or "sqlite:///./pitstop.db"
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
SYNTHETIC_LABEL = os.getenv("SYNTHETIC_LABEL", "true").lower() == "true"
