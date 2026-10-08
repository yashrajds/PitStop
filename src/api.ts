/* PITSTOP API client — mobile-optimized: small payloads, pagination, timeout, graceful fallback.
   Set VITE_API_URL to your FastAPI origin, e.g. http://localhost:8000/api
   All demo data is synthetic and labelled as such. */
import { demandZones, filterStations, opportunities, pipelineJobs, stations as mockStations, type Station } from "./data"

export const API_BASE =
  (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_URL ?? "http://localhost:8000/api"

async function get<T>(path: string, timeoutMs = 6000): Promise<T | null> {
  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(`${API_BASE}${path}`, { signal: ctrl.signal })
    if (!r.ok) throw new Error(String(r.status))
    return (await r.json()) as T
  } catch {
    return null
  } finally {
    window.clearTimeout(t)
  }
}

async function post<T>(path: string, body: unknown, timeoutMs = 15000): Promise<T | null> {
  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(`${API_BASE}${path}`, {
      method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    })
    if (!r.ok) throw new Error(String(r.status))
    return (await r.json()) as T
  } catch {
    return null
  } finally {
    window.clearTimeout(t)
  }
}

export type ApiState<T> = { data: T | null; loading: boolean; live: boolean; error: boolean; retry: () => void }

import { useCallback, useEffect, useState } from "react"

function useQuery<T>(key: string, fetcher: () => Promise<T | null>, fallback: T | null = null): ApiState<T> {
  const [data, setData] = useState<T | null>(fallback)
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(false)
  const [error, setError] = useState(false)
  const [nonce, setNonce] = useState(0)
  const retry = useCallback(() => setNonce((n) => n + 1), [])
  useEffect(() => {
    let dead = false
    setLoading(true)
    fetcher().then((res) => {
      if (dead) return
      if (res) { setData(res); setLive(true); setError(false) }
      else { setLive(false); setError(fallback === null && data === null) }
      setLoading(false)
    })
    return () => { dead = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce])
  return { data, loading, live, error, retry }
}

/* ---- endpoints ---- */
export interface Kpis { utilization: number; utilizationDelta: number; evSessions: string; fuelVolume: string; stationCount: number; series7d: number[]; serviceMix: { label: string; pct: number }[] }
export function useKpis() {
  return useQuery<Kpis>("kpis", () => get<Kpis>("/kpis"), {
    utilization: 67.4, utilizationDelta: 8.2, evSessions: "18.2K", fuelVolume: "2.4M L",
    stationCount: 1284, series7d: [62, 64, 63, 66, 68, 65, 67],
    serviceMix: [{ label: "Fuel", pct: 38 }, { label: "EV charge", pct: 27 }, { label: "Service", pct: 21 }, { label: "Other", pct: 14 }],
  })
}

export function useStations(params: { kind: string; minRating: number; maxDistance: number; q?: string }) {
  const key = `stations-${params.kind}-${params.minRating}-${params.maxDistance}-${params.q ?? ""}`
  const fallback = {
    items: filterStations(params.maxDistance, params.kind as never, params.minRating),
    total: filterStations(params.maxDistance, params.kind as never, params.minRating).length,
  }
  const q = useQuery<{ items: Station[]; total: number }>(key, async () => {
    const sp = new URLSearchParams({ kind: params.kind, min_rating: String(params.minRating), max_distance: String(params.maxDistance), limit: "30", page: "1" })
    if (params.q) sp.set("q", params.q)
    const r = await get<{ items: Station[]; total: number }>(`/stations?${sp}`)
    return r
  }, fallback)
  return q
}

export function useEtl() {
  return useQuery("etl", () => get<{
    extracted: number; cleaned: number; rejected: number; loaded: number; status: string; finishedAt: string | null; jobs: typeof pipelineJobs
  }>("/etl/status"), {
    extracted: 0, cleaned: 0, rejected: 0, loaded: 0, status: "offline (showing cached demo)", finishedAt: null, jobs: pipelineJobs,
  })
}

export function useMining(path: "/mining/clusters" | "/mining/predictions" | "/mining/anomalies" | "/mining/opportunities", fallback: never) {
  return useQuery(path, () => get(path), fallback)
}

export async function runEtl() {
  return post("/etl/run", {}, 30000)
}

export async function olap(body: Record<string, unknown>) {
  return post<{ operation: string; explanation: string; columns: string[]; rows: Record<string, string | number>[] }>("/olap/query", body)
}

export function synthBadge(live: boolean, loading: boolean) {
  if (loading) return "syncing…"
  return live ? "live · synthetic demo" : "offline · cached demo"
}

export { demandZones, opportunities, mockStations }
