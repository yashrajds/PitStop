export type ServiceKind = "Fuel" | "EV Charge" | "Battery Swap" | "Repair" | "Tyres" | "Car Wash" | "Parking" | "Roadside" | "Parts"

export interface Station {
  id: number
  name: string
  kind: ServiceKind
  distance: string
  distanceKm: number
  eta: string
  price: string
  availability: string
  rating: number
  address: string
  accent: "amber" | "blue" | "green"
  lat: number
  lng: number
}

export const services: Array<{ name: ServiceKind; icon: string; meta: string }> =
  [
    { name: "Fuel", icon: "fuel", meta: "₹104.2/L" },
    { name: "EV Charge", icon: "bolt", meta: "18 nearby" },
    { name: "Battery Swap", icon: "battery", meta: "6 ready" },
    { name: "Repair", icon: "tool", meta: "12 open" },
    { name: "Tyres", icon: "wheel", meta: "8 nearby" },
    { name: "Car Wash", icon: "drop", meta: "From ₹349" },
    { name: "Parking", icon: "parking", meta: "142 spots" },
    { name: "Roadside", icon: "shield", meta: "24/7" },
    { name: "Parts", icon: "parts", meta: "3.4k items" },
  ]

export const stations: Station[] = [
  {
    id: 1,
    name: "Ather Grid · Indiranagar",
    kind: "EV Charge",
    distance: "0.8 km",
    distanceKm: 0.8,
    eta: "4 min",
    price: "₹18.5 / kWh",
    availability: "4 of 6 available",
    rating: 4.8,
    address: "100 Feet Road, Indiranagar",
    accent: "amber",
    lat: 12.9784,
    lng: 77.6408,
  },
  {
    id: 2,
    name: "Shell Mobility Hub",
    kind: "Fuel",
    distance: "1.4 km",
    distanceKm: 1.4,
    eta: "6 min",
    price: "₹104.21 / L",
    availability: "Open · Low traffic",
    rating: 4.6,
    address: "Old Airport Road, Domlur",
    accent: "blue",
    lat: 12.9626,
    lng: 77.6484,
  },
  {
    id: 3,
    name: "Pitcrew Auto Studio",
    kind: "Repair",
    distance: "2.1 km",
    distanceKm: 2.1,
    eta: "9 min",
    price: "Inspection ₹499",
    availability: "2 bays available",
    rating: 4.9,
    address: "HAL 2nd Stage, Bengaluru",
    accent: "green",
    lat: 12.9612,
    lng: 77.6565,
  },
  {
    id: 4,
    name: "Park+ Metro Square",
    kind: "Parking",
    distance: "2.8 km",
    distanceKm: 2.8,
    eta: "11 min",
    price: "₹40 / hour",
    availability: "38 spots free",
    rating: 4.5,
    address: "MG Road, Bengaluru",
    accent: "amber",
    lat: 12.9716,
    lng: 77.6197,
  },
  {
    id: 5,
    name: "BluePlug Fast Charge · HSR",
    kind: "EV Charge",
    distance: "3.6 km",
    distanceKm: 3.6,
    eta: "12 min",
    price: "₹21 / kWh",
    availability: "2 of 4 available",
    rating: 4.6,
    address: "27th Main, HSR Layout",
    accent: "amber",
    lat: 12.9116,
    lng: 77.6473,
  },
  {
    id: 6,
    name: "Indian Oil · Sarjapur Road",
    kind: "Fuel",
    distance: "5.4 km",
    distanceKm: 5.4,
    eta: "16 min",
    price: "₹103.9 / L",
    availability: "Open · Moderate queue",
    rating: 4.3,
    address: "Sarjapur Main Road",
    accent: "blue",
    lat: 12.9010,
    lng: 77.6850,
  },
  {
    id: 7,
    name: "TyreHub Whitefield",
    kind: "Tyres",
    distance: "8.2 km",
    distanceKm: 8.2,
    eta: "24 min",
    price: "Alignment ₹599",
    availability: "5 bays available",
    rating: 4.7,
    address: "ITPL Main Road, Whitefield",
    accent: "green",
    lat: 12.9833,
    lng: 77.7500,
  },
  {
    id: 8,
    name: "Tata Power EZ · Yelahanka",
    kind: "EV Charge",
    distance: "12.5 km",
    distanceKm: 12.5,
    eta: "33 min",
    price: "₹17.9 / kWh",
    availability: "6 of 8 available",
    rating: 4.4,
    address: "Bellary Road, Yelahanka",
    accent: "amber",
    lat: 13.1007,
    lng: 77.5963,
  },
  {
    id: 9,
    name: "Sparkle Car Spa",
    kind: "Car Wash",
    distance: "15.8 km",
    distanceKm: 15.8,
    eta: "40 min",
    price: "From ₹349",
    availability: "Open · No wait",
    rating: 4.5,
    address: "Electronic City Phase 1",
    accent: "blue",
    lat: 12.8453,
    lng: 77.6602,
  },
]

export const demandZones = [
  { area: "Whitefield", demand: "Very high", change: "+18%", score: 92 },
  { area: "Koramangala", demand: "High", change: "+11%", score: 78 },
  { area: "Yelahanka", demand: "Emerging", change: "+27%", score: 64 },
]

export const opportunities = [
  {
    title: "Fast charging hub",
    area: "Whitefield East",
    score: 94,
    detail: "2.8× unmet evening demand",
  },
  {
    title: "Battery swap point",
    area: "Yelahanka",
    score: 87,
    detail: "4,200 daily 2W trips",
  },
  {
    title: "Multi-brand workshop",
    area: "Sarjapur Road",
    score: 81,
    detail: "14 min avg. service drive",
  },
]

export const pipelineJobs = [
  {
    name: "Station telemetry",
    rows: "12.8M",
    status: "Healthy",
    updated: "2m ago",
  },
  {
    name: "Mobility demand",
    rows: "4.2M",
    status: "Healthy",
    updated: "8m ago",
  },
  {
    name: "Pricing signals",
    rows: "862K",
    status: "Delayed",
    updated: "34m ago",
  },
  {
    name: "Service registry",
    rows: "128K",
    status: "Healthy",
    updated: "1h ago",
  },
]

export const MIN_RADIUS = 1
export const MAX_RADIUS = 20

export function filterStations(radius: number, kind: ServiceKind | "All", minRating = 0) {
  return stations
    .filter((s) => s.distanceKm <= radius && (kind === "All" || s.kind === kind) && s.rating >= minRating)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}
