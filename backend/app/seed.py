"""Deterministic synthetic demo data generator (clearly labelled synthetic).

Bengaluru areas, 9 service kinds, 90 days of demand with realistic patterns:
- evening peak 6:30-8:45pm, weekend EV surge, monsoon tyre spike.
"""
import random
from datetime import date, timedelta

AREAS = ["Indiranagar", "Domlur", "Whitefield", "HSR Layout", "Koramangala",
         "Yelahanka", "Electronic City", "Sarjapur Road", "MG Road", "Bellandur"]
KINDS = ["Fuel", "EV Charge", "Battery Swap", "Repair", "Tyres",
         "Car Wash", "Parking", "Roadside", "Parts"]
VEHICLES = [("Car", "Petrol"), ("SUV", "Diesel"), ("2W", "Petrol"),
            ("Car", "Electric"), ("Fleet", "Electric"), ("Bus", "Diesel")]

PROVIDERS = [
    ("Ather Grid · Indiranagar", "EV Charge", "Indiranagar", "100 Feet Road, Indiranagar", 4.8, 0.8, "₹18.5 / kWh"),
    ("Shell Mobility Hub", "Fuel", "Domlur", "Old Airport Road, Domlur", 4.6, 1.4, "₹104.21 / L"),
    ("Pitcrew Auto Studio", "Repair", "Domlur", "HAL 2nd Stage, Bengaluru", 4.9, 2.1, "Inspection ₹499"),
    ("Park+ Metro Square", "Parking", "MG Road", "MG Road, Bengaluru", 4.5, 2.8, "₹40 / hour"),
    ("BluePlug Fast Charge · HSR", "EV Charge", "HSR Layout", "27th Main, HSR Layout", 4.6, 3.6, "₹21 / kWh"),
    ("Indian Oil · Sarjapur Road", "Fuel", "Sarjapur Road", "Sarjapur Main Road", 4.3, 5.4, "₹103.9 / L"),
    ("TyreHub Whitefield", "Tyres", "Whitefield", "ITPL Main Road, Whitefield", 4.7, 8.2, "Alignment ₹599"),
    ("Tata Power EZ · Yelahanka", "EV Charge", "Yelahanka", "Bellary Road, Yelahanka", 4.4, 12.5, "₹17.9 / kWh"),
    ("Sparkle Car Spa", "Car Wash", "Electronic City", "Electronic City Phase 1", 4.5, 15.8, "From ₹349"),
    ("SwapX Battery Point", "Battery Swap", "Koramangala", "80 Feet Road, Koramangala", 4.5, 4.2, "₹79 / swap"),
    ("QuickFix Motors", "Repair", "Whitefield", "Hope Farm Junction", 4.4, 7.1, "Service ₹999"),
    ("SafePark Bellandur", "Parking", "Bellandur", "Outer Ring Road", 4.2, 6.0, "₹35 / hour"),
    ("RescueRide 24x7", "Roadside", "HSR Layout", "Sector 2, HSR", 4.7, 3.1, "₹299 / visit"),
    ("AutoParts Bazaar", "Parts", "Koramangala", "5th Block, Koramangala", 4.3, 4.9, "3.4k items"),
]


def raw_records(days: int = 90, seed: int = 42):
    """Yield raw (dirty) records as the ETL 'extract' stage would receive."""
    rng = random.Random(seed)
    today = date.today()
    rec_id = 0
    for d in range(days):
        day = today - timedelta(days=days - 1 - d)
        weekend = 1 if day.weekday() >= 5 else 0
        for (pname, kind, area, _addr, _rt, _km, _pr) in PROVIDERS:
            for vtype, ftype in rng.sample(VEHICLES, k=rng.randint(2, 4)):
                rec_id += 1
                base = {"Fuel": 90, "EV Charge": 70, "Parking": 120, "Repair": 25,
                        "Tyres": 20, "Car Wash": 35, "Battery Swap": 45,
                        "Roadside": 8, "Parts": 30}[kind]
                peak = 1.6 if kind in ("EV Charge", "Fuel") else 1.3
                sessions = int(base * (1 + 0.35 * weekend) * rng.uniform(0.7, 1.3) * (peak if rng.random() < 0.25 else 1.0))
                wait = round(rng.uniform(2, 25) * (1.4 if sessions > base * 1.4 else 1.0), 1)
                util = round(min(99, sessions / (base * 1.8) * 100), 1)
                price = round({"Fuel": 104.0, "EV Charge": 19.0}.get(kind, 300) * rng.uniform(0.95, 1.08), 2)
                rec = {"id": rec_id, "date": day.isoformat(), "area": area, "city": "Bengaluru",
                       "provider": pname, "service": kind, "vehicle_type": vtype, "fuel_type": ftype,
                       "sessions": sessions, "quantity": round(sessions * rng.uniform(4, 14), 1),
                       "revenue": round(sessions * price, 2), "avg_wait_min": wait,
                       "utilization_pct": util, "price": price}
                # inject ~3% dirty rows for ETL to reject/clean
                r = rng.random()
                if r < 0.015:
                    rec["sessions"] = -5  # invalid -> reject
                elif r < 0.03:
                    rec["area"] = "  whitefield "  # messy -> clean
                yield rec
