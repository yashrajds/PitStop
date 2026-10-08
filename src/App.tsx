import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { duration, haptic, stagger, useCountUp, useScrollDirection, useSettled } from "./motion"
import {
  demandZones,
  filterStations,
  MAX_RADIUS,
  MIN_RADIUS,
  opportunities,
  pipelineJobs,
  services,
  stations,
  type ServiceKind,
  type Station,
} from "./data"
import { synthBadge, useEtl, useKpis, useMining, useStations, olap as olapPost, runEtl } from "./api"

type Screen = "home" | "nearby" | "detail" | "search" | "analytics" | "mining" | "predictions" | "opportunities" | "etl" | "profile"

type IconName = "home" | "map" | "chart" | "layers" | "user" | "search" | "bell" | "chevron" | "back" | "fuel" | "bolt" | "battery" | "tool" | "wheel" | "drop" | "parking" | "shield" | "parts" | "route" | "clock" | "star" | "filter" | "locate" | "trend" | "database" | "spark" | "settings" | "car" | "more" | "check" | "calendar" | "download" | "sun"

const paths: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </>
  ),
  map: (
    <>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5Z" />
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  chevron: <path d="m9 18 6-6-6-6" />,
  back: (
    <>
      <path d="m15 18-6-6 6-6" />
      <path d="M9 12h10" />
    </>
  ),
  fuel: (
    <>
      <path d="M5 21V4h10v17M3 21h14M7 8h6" />
      <path d="m15 7 3 3v7a2 2 0 0 0 4 0v-6l-2-2" />
    </>
  ),
  bolt: <path d="m13 2-8 12h7l-1 8 8-12h-7Z" />,
  battery: (
    <>
      <rect x="3" y="7" width="17" height="10" rx="2" />
      <path d="M20 10h2v4h-2M11 9v6M8 12h6" />
    </>
  ),
  tool: (
    <path d="M14.7 6.3a4 4 0 0 0-5-5L7 4l3 3-7.5 7.5a3.5 3.5 0 0 0 5 5L15 12l3 3 2.7-2.7a4 4 0 0 0-5-5L13 10" />
  ),
  wheel: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <path d="m12 3 0 6m7.8-1.5-5.2 3M19.8 16.5l-5.2-3M12 21v-6M4.2 16.5l5.2-3M4.2 7.5l5.2 3" />
    </>
  ),
  drop: <path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z" />,
  parking: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
      <path d="m9 12 2 2 4-5" />
    </>
  ),
  parts: (
    <>
      <path d="M8 3v4M16 3v4M5 7h14v5a7 7 0 0 1-14 0Z" />
      <path d="M12 19v3" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  star: (
    <path d="m12 2 3 6 6.5 1-4.7 4.6 1.1 6.5-5.9-3.1-5.9 3.1 1.1-6.5L2.5 9 9 8Z" />
  ),
  filter: (
    <>
      <path d="M4 6h16M7 12h10M10 18h4" />
      <circle cx="9" cy="6" r="1" />
      <circle cx="15" cy="12" r="1" />
    </>
  ),
  locate: (
    <>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  trend: (
    <>
      <path d="m3 17 6-6 4 4 8-9" />
      <path d="M15 6h6v6" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </>
  ),
  spark: (
    <>
      <path d="m12 2 1.4 5.6L19 9l-5.6 1.4L12 16l-1.4-5.6L5 9l5.6-1.4Z" />
      <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7Z" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  car: (
    <>
      <path d="m5 11 2-5h10l2 5" />
      <path d="M3 12a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5H3Z" />
      <path d="M5 17v3h3v-3M16 17v3h3v-3M7 14h2M15 14h2" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  check: <path d="m5 12 4 4 10-10" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 21h16" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
}

function Icon({ name, size = 20 }: { name: IconName | string; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[(name as IconName)] ?? paths.spark}
    </svg>
  )
}

function Surface({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`surface ${className}`}>{children}</div>
}

type KindFilter = ServiceKind | "All"

const kindIcon: Record<ServiceKind, IconName> = {
  Fuel: "fuel",
  "EV Charge": "bolt",
  "Battery Swap": "battery",
  Repair: "tool",
  Tyres: "wheel",
  "Car Wash": "drop",
  Parking: "parking",
  Roadside: "shield",
  Parts: "parts",
}

const formatKm = (km: number) => (Number.isInteger(km) ? `${km}` : km.toFixed(1))

function RadiusSlider({
  value,
  onChange,
  onDragChange,
}: {
  value: number
  onChange: (value: number) => void
  onDragChange?: (dragging: boolean) => void
}) {
  const [dragging, setDragging] = useState(false)
  const pct = ((value - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS)) * 100
  const setDrag = (next: boolean) => {
    setDragging(next)
    onDragChange?.(next)
  }
  return (
    <input
      className={`radius-range ${dragging ? "dragging" : ""}`}
      type="range"
      min={MIN_RADIUS}
      max={MAX_RADIUS}
      step={0.5}
      value={value}
      style={{ "--fill": `${pct}%` } as CSSProperties}
      onPointerDown={() => setDrag(true)}
      onPointerUp={() => setDrag(false)}
      onPointerCancel={() => setDrag(false)}
      onKeyDown={() => onDragChange?.(true)}
      onKeyUp={() => onDragChange?.(false)}
      onBlur={() => setDrag(false)}
      onChange={(event) => {
        const next = clampRadius(Number(event.target.value))
        if (next !== value && HAPTIC_STOPS.includes(next)) haptic()
        onChange(next)
      }}
      aria-label="Search radius in kilometres"
      aria-valuetext={`${formatKm(value)} kilometres`}
    />
  )
}

const clampRadius = (value: number) =>
  Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, Math.round(value * 2) / 2))

const HAPTIC_STOPS = [1, 5, 10, 15, 20]

function RollingNumber({ value }: { value: string }) {
  const prev = useRef(value)
  const [out, setOut] = useState<{ text: string; id: number; dir: 1 | -1 } | null>(null)
  const counter = useRef(0)
  const dir = useRef<1 | -1>(1)
  if (prev.current !== value) {
    dir.current = parseFloat(value) >= parseFloat(prev.current) ? 1 : -1
  }
  useEffect(() => {
    if (prev.current === value) return
    setOut({ text: prev.current, id: ++counter.current, dir: dir.current })
    prev.current = value
    const t = window.setTimeout(() => setOut(null), duration.medium)
    return () => window.clearTimeout(t)
  }, [value])
  return (
    <span className="rolling" aria-live="polite" aria-atomic="true">
      <span key={value} className={`rolling-in ${dir.current === 1 ? "up" : "down"}`}>
        {value}
      </span>
      {out && (
        <span key={out.id} className={`rolling-out ${out.dir === 1 ? "up" : "down"}`} aria-hidden="true">
          {out.text}
        </span>
      )}
    </span>
  )
}

function Availability({ text }: { text: string }) {
  const match = text.match(/^(\d+)(.*)$/)
  const n = useCountUp(match ? Number(match[1]) : 0)
  if (!match) return <>{text}</>
  return (
    <>
      {n}
      {match[2]}
    </>
  )
}

function LocateButton({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"idle" | "locating" | "done">("idle")
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])
  const start = () => {
    if (phase !== "idle") return
    haptic(10)
    setPhase("locating")
    timers.current.push(
      window.setTimeout(() => setPhase("done"), 1100),
      window.setTimeout(() => {
        onDone()
        setPhase("idle")
      }, 1100 + 900),
    )
  }
  return (
    <button
      className={`liquid-go ${phase}`}
      onClick={start}
      aria-label={phase === "idle" ? "Find nearby services" : phase === "locating" ? "Locating you" : "Location found"}
      aria-busy={phase === "locating"}
    >
      <i className="go-pulse" aria-hidden="true" />
      <i className="go-spinner" aria-hidden="true" />
      {phase === "done" ? (
        <svg className="go-check" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 12.5 4.5 4.5L19 7.5" pathLength={1} />
        </svg>
      ) : (
        <Icon name="locate" size={23} />
      )}
    </button>
  )
}

const tapAnim: Partial<Record<ServiceKind, string>> = {
  Fuel: "bob",
  "EV Charge": "flash",
  "Battery Swap": "charge",
  Repair: "wiggle",
  Tyres: "spin",
  "Car Wash": "drop",
}

function TopBar({
  title,
  eyebrow,
  onBack,
  action,
}: {
  title: string
  eyebrow?: string
  onBack?: () => void
  action?: ReactNode
}) {
  return (
    <header className="topbar">
      {onBack ? (
        <button className="icon-button" onClick={onBack} aria-label="Go back">
          <Icon name="back" />
        </button>
      ) : (
        <div className="brand-mark">
          <span>P</span>
        </div>
      )}
      <div className="topbar-copy">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <strong>{title}</strong>
      </div>
      {action ?? (
        <button className="icon-button" aria-label="Notifications">
          <Icon name="bell" />
          <i className="notice-dot" />
        </button>
      )}
    </header>
  )
}

const tabOrder: Screen[] = ["home", "nearby", "analytics", "etl", "profile"]

function tabOf(screen: Screen): Screen {
  if (screen === "detail" || screen === "search") return "nearby"
  if (screen === "mining" || screen === "predictions" || screen === "opportunities") return "analytics"
  return screen
}

const rank = (screen: Screen) =>
  tabOrder.indexOf(tabOf(screen)) + (tabOf(screen) === screen ? 0 : 0.5)

function BottomNav({
  screen,
  navigate,
}: {
  screen: Screen
  navigate: (screen: Screen) => void
}) {
  const items: Array<{ screen: Screen; label: string; icon: IconName }> = [
    { screen: "home", label: "Home", icon: "home" },
    { screen: "nearby", label: "Nearby", icon: "map" },
    { screen: "analytics", label: "Insights", icon: "chart" },
    { screen: "etl", label: "Data", icon: "layers" },
    { screen: "profile", label: "Profile", icon: "user" },
  ]
  const active = tabOf(screen)
  const index = Math.max(0, items.findIndex((item) => item.screen === active))
  const scrollDir = useScrollDirection()
  return (
    <nav className={`bottom-nav ${scrollDir === "down" ? "hidden" : ""}`} aria-label="Primary navigation">
      <div className="nav-track" style={{ "--tab-index": index, "--tab-count": items.length } as CSSProperties}>
        <span className="nav-pill" aria-hidden="true"><i key={index} /></span>
        {items.map((item) => (
          <button
            key={item.screen}
            className={active === item.screen ? "active" : ""}
            aria-current={active === item.screen ? "page" : undefined}
            onClick={() => {
              haptic(6)
              navigate(item.screen)
            }}
          >
            <Icon name={item.icon} size={21} />
            <small>{item.label}</small>
          </button>
        ))}
      </div>
    </nav>
  )
}

function SectionTitle({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {action}
    </div>
  )
}

function StationRow({
  station,
  onClick,
}: {
  station: Station
  onClick: () => void
}) {  return (
    <button className="station-row" onClick={onClick}>
      <span className={`station-icon ${station.accent}`}>
        <Icon name={kindIcon[station.kind]} />
      </span>
      <span className="station-copy">
        <strong>{station.name}</strong>
        <small>
          {station.kind} · {station.distance} · {station.eta}
        </small>
        <em>{station.availability}</em>
      </span>
      <span className="station-price">
        {station.price}
        <Icon name="chevron" size={16} />
      </span>
    </button>
  )
}

/* API status pill + loading/error/empty states — reuses soft-skeuomorphic language. */
function ApiPill({ loading, live, onRetry }: { loading: boolean; live: boolean; onRetry?: () => void }) {
  return (
    <span className={`api-pill ${live ? "live" : "cached"}`} role="status">
      <i className={loading ? "pulse" : ""} />
      {synthBadge(live, loading)}
      {!loading && !live && onRetry && (
        <button className="api-retry" onClick={onRetry} aria-label="Retry connection">Retry</button>
      )}
    </span>
  )
}

function SkeletonRows({ n = 3 }: { n?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: n }).map((_, i) => (
        <Surface key={i} className="skeleton-row"><i /><span><b /><small /></span></Surface>
      ))}
    </div>
  )
}

function Home({
  navigate,
  openStation,
  radius,
  settledRadius,
  setRadius,
  onRadiusDrag,
  kind,
  setKind,
  minRating,
}: {
  navigate: (s: Screen) => void
  openStation: (s: Station) => void
  radius: number
  settledRadius: number
  setRadius: (r: number) => void
  onRadiusDrag: (dragging: boolean) => void
  kind: KindFilter
  setKind: (k: KindFilter) => void
  minRating: number
}) {
  const nearest = filterStations(settledRadius, kind, minRating)[0]
  const pending = radius !== settledRadius
  const [tap, setTap] = useState<{ name: string; id: number } | null>(null)
  const homeServices = services.slice(0, 6)

  const pick = (name: ServiceKind) => {
    haptic(6)
    setTap({ name, id: (tap?.id ?? 0) + 1 })
    setKind(kind === name ? "All" : name)
  }

  return (
    <>
      <header className="liquid-topbar">
        <button aria-label="Notifications">
          <Icon name="bell" size={18} />
        </button>
        <button className="liquid-profile" onClick={() => navigate("profile")} aria-label="Open profile">
          <Icon name="user" size={17} />
        </button>
        <button aria-label="Open search" onClick={() => navigate("search")}>
          <Icon name="more" size={20} />
        </button>
      </header>
      <main className="liquid-home">
        <section className="liquid-chamber enter-hero">
          <div className="liquid-copy enter-title">
            <span>PITSTOP · BENGALURU</span>
            <h1>Choose a service type</h1>
          </div>
          <div className={`orb-grid ${kind !== "All" ? "has-selection" : ""}`}>
            {homeServices.map((service, i) => {
              const selected = kind === service.name
              const played = tap?.name === service.name
              return (
                <button
                  key={service.name}
                  className={`enter-orb ${selected ? "active" : ""}`}
                  style={stagger(i, 50, 260)}
                  aria-pressed={selected}
                  onClick={() => pick(service.name)}
                  aria-label={service.name}
                >
                  <span>
                    <i className="orb-ring" aria-hidden="true" />
                    <span
                      key={played ? tap.id : 0}
                      className={`orb-icon ${played ? `play anim-${tapAnim[service.name]}` : ""}`}
                    >
                      <Icon name={kindIcon[service.name]} size={24} />
                    </span>
                  </span>
                  <small>{service.name}</small>
                </button>
              )
            })}
          </div>
          <div className="chamber-bubbles">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </section>
        <section className="liquid-deck enter-deck">
          <div className="radius-label enter-rise" style={stagger(0, 60, 520)}>
            <Icon name="locate" size={15} />
            <span>Search radius</span>
          </div>
          <div className="liquid-slider enter-rise" style={stagger(1, 60, 520)}>
            <RadiusSlider value={radius} onChange={setRadius} onDragChange={onRadiusDrag} />
          </div>
          <div className="radius-value enter-rise" style={stagger(1, 60, 520)}>
            <small>{MIN_RADIUS} km</small>
            <strong>
              <RollingNumber value={formatKm(radius)} /> <em>km</em>
            </strong>
            <small>{MAX_RADIUS} km</small>
          </div>
          <div className="enter-rise" style={stagger(2, 60, 520)}>
            {nearest ? (
              <button
                key={nearest.id}
                className={`nearest-stop swap ${pending ? "loading" : ""}`}
                onClick={() => openStation(nearest)}
                aria-busy={pending}
              >
                <span>
                  <Icon name={kindIcon[nearest.kind]} size={18} />
                </span>
                <span>
                  <small>NEAREST {(kind === "All" ? "SERVICE" : kind).toUpperCase()}</small>
                  <strong>{nearest.name}</strong>
                  <em>
                    {nearest.distance} · <Availability text={nearest.availability} />
                  </em>
                </span>
                <span className="chev">
                  <Icon name="chevron" size={17} />
                </span>
              </button>
            ) : (
              <div className={`nearest-stop empty swap ${pending ? "loading" : ""}`} role="status">
                <span>
                  <Icon name="locate" size={18} />
                </span>
                <span>
                  <strong>Nothing within {formatKm(settledRadius)} km</strong>
                  <em>Widen the radius to see more</em>
                </span>
              </div>
            )}
          </div>
          <div className="enter-rise go-wrap" style={stagger(3, 60, 520)}>
            <LocateButton onDone={() => navigate("nearby")} />
          </div>
          <p className="enter-rise" style={stagger(4, 60, 520)}>
            Tap to explore services around you
          </p>
        </section>
      </main>
    </>
  )
}

// ─── OpenStreetMap (Leaflet, no API key needed) ───────────────────────────────
import L from "leaflet"

/** Accent colours that match the app palette */
const accentHex: Record<"amber" | "blue" | "green", string> = {
  amber: "#f0a070",
  blue: "#70a8f0",
  green: "#70c87a",
}

/** Free CARTO dark tiles (OpenStreetMap data) */
const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

function pinIcon(fill: string, selected: boolean): L.DivIcon {
  const size = selected ? 46 : 36
  return L.divIcon({
    className: "pit-pin-wrap",
    html: `<span class="pit-pin${selected ? " selected" : ""}" style="--pin:${fill}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function OsmMapPanel({
  stations: stationList,
  onSelectStation,
  selectedId,
  onLocate,
}: {
  stations: Station[]
  onSelectStation: (s: Station) => void
  selectedId?: number
  onLocate: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Map<number, L.Marker>>(new Map())
  const userMarkerRef = useRef<L.CircleMarker | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  // Centre on Bengaluru (Indiranagar area) as default
  const BENGALURU: L.LatLngExpression = [12.9716, 77.6412]

  /** Initialise the map (only once) */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    try {
      const map = L.map(containerRef.current, { zoomControl: false })
      map.setView(BENGALURU, 12)
      L.tileLayer(TILE_URL, { maxZoom: 20, attribution: TILE_ATTR }).addTo(map)
      L.control.zoom({ position: "bottomright" }).addTo(map)
      mapRef.current = map
      setMapReady(true)
    } catch {
      setMapError("Map tiles could not be loaded — check your connection")
    }
    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current.clear()
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  /** Keep markers in sync with the station list */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const existing = new Set(markersRef.current.keys())

    stationList.forEach((s) => {
      existing.delete(s.id)
      const isSelected = s.id === selectedId
      const icon = pinIcon(accentHex[s.accent], isSelected)

      if (markersRef.current.has(s.id)) {
        const m = markersRef.current.get(s.id)!
        m.setIcon(icon)
        m.setZIndexOffset(isSelected ? 1000 : 0)
      } else {
        const m = L.marker([s.lat, s.lng], {
          icon,
          title: s.name,
          zIndexOffset: isSelected ? 1000 : 0,
        }).addTo(map)
        m.on("click", () => onSelectStation(s))
        markersRef.current.set(s.id, m)
      }
    })

    // Remove stale markers
    existing.forEach((id) => {
      markersRef.current.get(id)?.remove()
      markersRef.current.delete(id)
    })
  }, [stationList, selectedId, mapReady])

  /** Pan to selected station */
  useEffect(() => {
    if (!mapRef.current || !selectedId) return
    const s = stationList.find((x) => x.id === selectedId)
    if (s) mapRef.current.panTo([s.lat, s.lng])
  }, [selectedId])

  /** Geolocate the user */
  const handleLocate = () => {
    if (!("geolocation" in navigator)) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng: L.LatLngExpression = [pos.coords.latitude, pos.coords.longitude]
        mapRef.current?.setView(latlng, 14)
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng(latlng)
        } else if (mapRef.current) {
          userMarkerRef.current = L.circleMarker(latlng, {
            radius: 9,
            color: "#fff",
            weight: 2,
            fillColor: "#60a5fa",
            fillOpacity: 1,
          }).addTo(mapRef.current)
        }
        setLocating(false)
        onLocate()
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  if (mapError) {
    return (
      <div className="map-panel map-error">
        <Icon name="map" size={32} />
        <p>{mapError}</p>
      </div>
    )
  }

  return (
    <div className="map-panel omap-panel">
      <div ref={containerRef} className="omap-canvas" />
      <button
        className={`locate-button ${locating ? "locating" : ""}`}
        onClick={handleLocate}
        aria-label="Centre map on my location"
        aria-busy={locating}
      >
        <Icon name="locate" />
      </button>
    </div>
  )
}

// ─── Nearby screen ──────────────────────────────────────────────────────────

function Nearby({
  navigate,
  openStation,
  radius,
  kind,
  setKind,
  minRating,
}: {
  navigate: (s: Screen) => void
  openStation: (s: Station) => void
  radius: number
  kind: KindFilter
  setKind: (k: KindFilter) => void
  minRating: number
}) {
  const fallback = filterStations(radius, kind, minRating)
  const live = useStations({ kind, minRating, maxDistance: radius })
  const results = live.data?.items?.length ? live.data.items : fallback
  const chips: KindFilter[] = ["All", "EV Charge", "Fuel", "Repair", "Tyres", "Car Wash", "Parking"]
  const [selectedId, setSelectedId] = useState<number | undefined>()

  const handleSelectStation = (s: Station) => {
    setSelectedId(s.id)
    openStation(s)
  }

  return (
    <>
      <TopBar
        title="Nearby services"
        eyebrow={`${results.length} ${results.length === 1 ? "option" : "options"} within ${formatKm(radius)} km`}
        action={
          <button className="icon-button" onClick={() => navigate("search")}>
            <Icon name="search" />
          </button>
        }
      />
      <main className="screen nearby-screen">
        <OsmMapPanel
          stations={results}
          onSelectStation={handleSelectStation}
          selectedId={selectedId}
          onLocate={() => {}}
        />
        <div className="nearby-sheet">
          <div className="sheet-handle" />
          <div className="sheet-head">
            <div>
              <span className="eyebrow">Closest first · <ApiPill loading={live.loading} live={live.live} onRetry={live.retry} /></span>
              <h1>Open near you</h1>
            </div>
            <span className="sort-button">within {formatKm(radius)} km</span>
          </div>
          <div className="filter-row">
            {chips.map((chip) => (
              <button
                key={chip}
                className={kind === chip ? "active" : ""}
                aria-pressed={kind === chip}
                onClick={() => setKind(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
          <div className="list-stack">
            {live.loading && <SkeletonRows n={3} />}
            {!live.loading && results.map((station) => (
              <Surface key={station.id}>
                <StationRow
                  station={station}
                  onClick={() => handleSelectStation(station)}
                />
              </Surface>
            ))}
            {results.length === 0 && (
              <Surface className="empty-state">
                <strong>No matches within {formatKm(radius)} km</strong>
                <small>Try a wider radius or another service.</small>
                <button className="text-button" onClick={() => navigate("search")}>
                  Adjust search
                </button>
              </Surface>
            )}
          </div>
        </div>
      </main>
    </>
  )
}

function Details({ station, back }: { station: Station; back: () => void }) {
  const [favorite, setFavorite] = useState(false)
  return (
    <>
      <TopBar
        title="Station details"
        onBack={back}
        action={
          <button
            className={`icon-button ${favorite ? "is-favorite" : ""}`}
            onClick={() => setFavorite(!favorite)}
          >
            <Icon name="star" />
          </button>
        }
      />
      <main className="screen detail-screen">
        <div className="detail-hero">
          <div className="map-grid" />
          <div className="map-road road-detail-a" />
          <div className="map-road road-detail-b" />
          <span className="hero-pin">
            <Icon
              name={
                station.kind === "Fuel"
                  ? "fuel"
                  : station.kind === "Repair"
                    ? "tool"
                    : "bolt"
              }
            />
          </span>
          <div className="distance-badge">
            <Icon name="route" size={17} /> {station.distance} · {station.eta}
          </div>
        </div>
        <section className="detail-sheet">
          <div className="sheet-handle" />
          <span className="status-line">
            <i /> OPEN NOW · until 11:30 PM
          </span>
          <h1>{station.name}</h1>
          <p>{station.address}</p>
          <div className="rating-line">
            <Icon name="star" size={17} />
            <strong>{station.rating}</strong>
            <span>326 reviews</span>
            <i /> <span>Verified location</span>
          </div>
          <div className="action-row">
            <button className="primary-action">
              <Icon name="route" /> Navigate
            </button>
            <button>
              <Icon name="calendar" />
              <span>Reserve</span>
            </button>
            <button>
              <Icon name="more" />
              <span>More</span>
            </button>
          </div>
          <Surface className="availability-card">
            <div>
              <span className="eyebrow">Live availability</span>
              <strong>{station.availability}</strong>
              <small>Updated less than a minute ago</small>
            </div>
            <div className="availability-ring">
              <span>4</span>
              <small>/ 6</small>
            </div>
          </Surface>
          <SectionTitle>Connectors & pricing</SectionTitle>
          <div className="connector-list">
            <div>
              <span className="connector-icon">
                <Icon name="bolt" />
              </span>
              <span>
                <strong>CCS2 · 60 kW</strong>
                <small>Fast charging</small>
              </span>
              <em>{station.price}</em>
            </div>
            <div>
              <span className="connector-icon">
                <Icon name="bolt" />
              </span>
              <span>
                <strong>Type 2 · 22 kW</strong>
                <small>Standard charging</small>
              </span>
              <em>₹14 / kWh</em>
            </div>
          </div>
          <SectionTitle>Popular times</SectionTitle>
          <Surface className="popular-card">
            <div className="popular-head">
              <span>Usually quiet now</span>
              <strong>24% full</strong>
            </div>
            <div className="mini-bars">
              {[26, 34, 42, 68, 82, 62, 38, 28, 24, 20, 26, 45].map((v, i) => (
                <i key={i} className={`bar h-${Math.round(v / 10)}`} />
              ))}
            </div>
            <div className="axis">
              <span>6 AM</span>
              <span>Noon</span>
              <span>6 PM</span>
              <span>Now</span>
            </div>
          </Surface>
        </section>
      </main>
    </>
  )
}

function SearchFilters({
  back,
  navigate,
  radius,
  settledRadius,
  setRadius,
  onRadiusDrag,
  kind,
  setKind,
  minRating,
  setMinRating,
}: {
  back: () => void
  navigate: (s: Screen) => void
  radius: number
  settledRadius: number
  setRadius: (r: number) => void
  onRadiusDrag: (dragging: boolean) => void
  kind: KindFilter
  setKind: (k: KindFilter) => void
  minRating: number
  setMinRating: (r: number) => void
}) {
  const count = filterStations(settledRadius, kind, minRating).length
  return (
    <>
      <TopBar
        title="Search & filters"
        onBack={back}
        action={
          <button
            className="text-button"
            onClick={() => {
              setRadius(5)
              setKind("All")
              setMinRating(0)
            }}
          >
            Reset
          </button>
        }
      />
      <main className="screen filter-screen">
        <label className="search-field">
          <Icon name="search" />
          <input placeholder="Search service, station or area" />
          <button>
            <Icon name="more" />
          </button>
        </label>
        <div className="recent-row">
          <span>Recent</span>
          <button>Whitefield</button>
          <button>Fast charging</button>
        </div>
        <SectionTitle>What do you need?</SectionTitle>
        <div className="service-grid">
          {services.map((service) => (
            <button
              key={service.name}
              className={kind === service.name ? "selected" : ""}
              aria-pressed={kind === service.name}
              onClick={() => setKind(kind === service.name ? "All" : service.name)}
            >
              <Icon name={kindIcon[service.name]} />
              <span>{service.name}</span>
              {kind === service.name && (
                <i>
                  <Icon name="check" size={12} />
                </i>
              )}
            </button>
          ))}
        </div>
        <SectionTitle>Distance</SectionTitle>
        <Surface className="distance-card">
          <div>
            <span>Search radius</span>
            <strong>{formatKm(radius)} km</strong>
          </div>
          <RadiusSlider value={radius} onChange={setRadius} onDragChange={onRadiusDrag} />
          <div className="axis">
            <span>{MIN_RADIUS} km</span>
            <span>{MAX_RADIUS} km</span>
          </div>
        </Surface>
        <SectionTitle>Preferences</SectionTitle>
        <Surface className="preference-list">
          <label>
            <span>
              <strong>Open now</strong>
              <small>Only currently operating locations</small>
            </span>
            <input type="checkbox" defaultChecked />
            <i />
          </label>
          <label>
            <span>
              <strong>Live availability</strong>
              <small>Show verified real-time capacity</small>
            </span>
            <input type="checkbox" defaultChecked />
            <i />
          </label>
          <label>
            <span>
              <strong>Highly rated</strong>
              <small>Rating of 4.5 and above</small>
            </span>
            <input
              type="checkbox"
              checked={minRating >= 4.5}
              onChange={(e) => setMinRating(e.target.checked ? 4.5 : 0)}
            />
            <i />
          </label>
        </Surface>
        <button className="apply-button" disabled={count === 0} onClick={() => navigate("nearby")}>
          {count === 0 ? "No results — widen radius" : `Show ${count} ${count === 1 ? "result" : "results"}`} <Icon name="chevron" />
        </button>
      </main>
    </>
  )
}

function Analytics({ navigate }: { navigate: (s: Screen) => void }) {
  const kpis = useKpis()
  const modules: Array<{
    screen: Screen
    icon: IconName
    title: string
    text: string
    stat: string
  }> = [
    {
      screen: "mining",
      icon: "spark",
      title: "Data mining",
      text: "Hidden mobility patterns",
      stat: "12 new",
    },
    {
      screen: "predictions",
      icon: "trend",
      title: "Predictions",
      text: "14-day demand outlook",
      stat: "89% conf.",
    },
    {
      screen: "opportunities",
      icon: "map",
      title: "Opportunities",
      text: "Infrastructure gaps",
      stat: "8 zones",
    },
  ]
  return (
    <>
      <TopBar title="Insights" eyebrow={`Bengaluru · ${synthBadge(kpis.live, kpis.loading)}`} />
      <main className="screen analytics-screen">
        <div className="analytics-intro">
          <span className="eyebrow">Last 7 days</span>
          <h1>This week on the road</h1>
          <p>Usage across {kpis.data?.stationCount ?? 1284} stations, chargers and workshops.</p>
        </div>
        <Surface className="pulse-card">
          <div className="pulse-head">
            <div>
              <span>Network utilization</span>
              <strong>{kpis.data?.utilization.toFixed(1) ?? "67.4"}%</strong>
            </div>
            <em>
              <Icon name="trend" size={15} /> {kpis.data?.utilizationDelta ?? 8.2}%
            </em>
          </div>
          <svg
            className="line-chart"
            viewBox="0 0 340 120"
            preserveAspectRatio="none"
            aria-label="Utilization increased over seven days"
          >
            <defs>
              <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e9806c" stopOpacity=".28" />
                <stop offset="100%" stopColor="#e9806c" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              className="chart-area"
              d="M0 100 C35 94 46 72 78 80 S120 102 148 63 S198 73 226 48 S281 62 340 18 L340 120 L0 120Z"
            />
            <path
              className="chart-line"
              d="M0 100 C35 94 46 72 78 80 S120 102 148 63 S198 73 226 48 S281 62 340 18"
            />
            <circle cx="340" cy="18" r="5" />
          </svg>
          <div className="axis">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </Surface>
        <div className="metric-row">
          <Surface>
            <Icon name="bolt" />
            <span>EV sessions</span>
            <strong>{kpis.data?.evSessions ?? "18.2K"}</strong>
            <small>+12.4% this week</small>
          </Surface>
          <Surface>
            <Icon name="fuel" />
            <span>Fuel volume</span>
            <strong>{kpis.data?.fuelVolume ?? "2.4M L"}</strong>
            <small>−3.1% this week</small>
          </Surface>
        </div>
        <SectionTitle>Insight modules</SectionTitle>
        <div className="module-stack">
          {modules.map((item) => (
            <button key={item.screen} onClick={() => navigate(item.screen)}>
              <span className="module-icon">
                <Icon name={item.icon} />
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </span>
              <em>{item.stat}</em>
              <Icon name="chevron" size={17} />
            </button>
          ))}
        </div>
        <SectionTitle>Service mix</SectionTitle>
        <Surface className="service-mix">
          <div className="donut">
            <span>
              <strong>1,284</strong>
              <small>locations</small>
            </span>
          </div>
          <div className="legend">
            <span>
              <i className="orange" />
              Fuel <strong>38%</strong>
            </span>
            <span>
              <i className="blue" />
              EV charge <strong>27%</strong>
            </span>
            <span>
              <i className="green" />
              Service <strong>21%</strong>
            </span>
            <span>
              <i className="silver" />
              Other <strong>14%</strong>
            </span>
          </div>
        </Surface>
      </main>
    </>
  )
}

function DataMining({ back }: { back: () => void }) {
  const clusters = useMining("/mining/clusters", { clusters: [] } as never)
  const anoms = useMining("/mining/anomalies", { anomalies: [] } as never)
  const list: { cluster?: string; title: string; detail: string; level: string }[] =
    (clusters.data as { clusters: { label: string; size: number; avgUtilization: number; why: string }[] } | null)?.clusters?.map((c, i) => ({
      title: c.label, detail: `${c.size} stations · ${c.avgUtilization}% util — ${c.why}`, level: i === 0 ? "High" : "Med",
    })) ?? []
  return (
    <>
      <TopBar title="Data mining" eyebrow={`Trips · ${synthBadge(clusters.live, clusters.loading)}`} onBack={back} />
      <main className="screen insight-screen">
        <div className="page-lead">
          <span className="eyebrow">Last model run · 08:40</span>
          <h1>
            What drivers do
            <br />
            around town
          </h1>
          <p>
            Patterns found in the last 90 days of Bengaluru trips.
          </p>
        </div>
        <Surface className="hero-insight">
          <div className="confidence">
            <span>94%</span>
            <small>confidence</small>
          </div>
          <span className="eyebrow">Strongest pattern</span>
          <h2>EV drivers pair charging with grocery visits</h2>
          <p>
            Charging sessions near shops run 23 minutes longer, and 31% of those drivers come back.
          </p>
          <button>
            Explore pattern <Icon name="chevron" size={17} />
          </button>
        </Surface>
        <SectionTitle>Discovered clusters</SectionTitle>
        <div className="cluster-visual">
          <span className="cluster c1">
            <b>42%</b>
            <small>Commuters</small>
          </span>
          <span className="cluster c2">
            <b>28%</b>
            <small>Fleet</small>
          </span>
          <span className="cluster c3">
            <b>19%</b>
            <small>Leisure</small>
          </span>
          <span className="cluster c4">
            <b>11%</b>
            <small>Other</small>
          </span>
        </div>
        <Surface className="finding-list">
          <div>
            <span className="number">01</span>
            <span>
              <strong>Tuesday tyre demand</strong>
              <small>1.7× baseline after monsoon rainfall</small>
            </span>
            <em>High</em>
          </div>
          <div>
            <span className="number">02</span>
            <span>
              <strong>Fleet charging window</strong>
              <small>11 PM–2 AM is underutilized by 38%</small>
            </span>
            <em>Med</em>
          </div>
          <div>
            <span className="number">03</span>
            <span>
              <strong>Cross-service affinity</strong>
              <small>Car wash + parking conversion is 24%</small>
            </span>
            <em>High</em>
          </div>
          {list.slice(0, 3).map((f, i) => (
            <div key={f.title}>
              <span className="number">L{i + 1}</span>
              <span><strong>{f.title}</strong><small>{f.detail}</small></span>
              <em>{f.level}</em>
            </div>
          ))}
          {(anoms.data as { anomalies: { provider: string; why: string }[] } | null)?.anomalies?.slice(0, 2).map((a) => (
            <div key={a.provider}>
              <span className="number">!</span>
              <span><strong>Anomaly · {a.provider}</strong><small>{a.why} (synthetic)</small></span>
              <em>High</em>
            </div>
          ))}
          {(clusters.loading || anoms.loading) && (
            <div><span className="number">…</span><span><strong>Mining live warehouse…</strong><small>K-Means + Isolation Forest</small></span></div>
          )}
        </Surface>
      </main>
    </>
  )
}

function Predictions({ back }: { back: () => void }) {
  const [range, setRange] = useState("7D")
  const preds = useMining("/mining/predictions", { forecast: [], hotspots: demandZones } as never)
  const fc = ((preds.data as { forecast: { service: string; growthPct: number; confidence: number; why: string }[]; hotspots: typeof demandZones } | null)?.forecast) ?? []
  const zones = ((preds.data as { hotspots: typeof demandZones } | null)?.hotspots) ?? demandZones
  return (
    <>
      <TopBar
        title="Demand predictions"
        eyebrow={`${synthBadge(preds.live, preds.loading)} · 89% model confidence`}
        onBack={back}
      />
      <main className="screen prediction-screen">
        <div className="segmented">
          {["24H", "7D", "14D"].map((item) => (
            <button
              className={range === item ? "active" : ""}
              onClick={() => setRange(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
        <Surface className="forecast-card">
          <div className="pulse-head">
            <div>
              <span>Predicted demand</span>
              <strong>+18.6%</strong>
            </div>
            <em>Next {range}</em>
          </div>
          <svg
            className="forecast-chart"
            viewBox="0 0 340 150"
            preserveAspectRatio="none"
          >
            <path
              className="forecast-band"
              d="M0 102 C40 88 60 105 95 75 S150 74 184 54 S240 74 275 35 S320 34 340 17 L340 62 C310 65 292 72 272 78 S224 96 190 90 S135 113 96 110 S42 124 0 126Z"
            />
            <path
              className="forecast-line"
              d="M0 114 C40 101 60 111 95 91 S150 90 184 71 S240 85 275 56 S320 53 340 39"
            />
            <path className="today-line" d="M184 5v135" />
            <text x="190" y="16">
              TODAY
            </text>
          </svg>
          <div className="axis">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
            <span>Sun</span>
          </div>
        </Surface>
        <SectionTitle>Demand hotspots</SectionTitle>
        {preds.loading && <SkeletonRows n={2} />}
        {fc.slice(0, 3).map((f) => (
          <Surface key={f.service} className="method-note">
            <Icon name="trend" />
            <span><strong>{f.service} {f.growthPct > 0 ? "+" : ""}{f.growthPct}% · next {range}</strong><small>{f.why} Conf. {f.confidence}% (synthetic)</small></span>
          </Surface>
        ))}
        <div className="zone-stack">
          {zones.map((zone) => (
            <Surface key={zone.area}>
              <div className="zone-score">{zone.score}</div>
              <div>
                <strong>{zone.area}</strong>
                <small>{zone.demand} demand</small>
              </div>
              <em>{zone.change}</em>
            </Surface>
          ))}
        </div>
        <SectionTitle>Peak window</SectionTitle>
        <Surface className="peak-card">
          <div className="peak-time">
            <Icon name="clock" />
            <span>
              <strong>6:30–8:45 PM</strong>
              <small>Tomorrow evening</small>
            </span>
          </div>
          <p>
            East Bengaluru runs out of fast chargers on Friday evenings.
          </p>
          <div className="capacity-bar">
            <i />
          </div>
          <div className="axis">
            <span>Supply 1,840</span>
            <span>Demand 2,310</span>
          </div>
        </Surface>
      </main>
    </>
  )
}

function Opportunities({ back }: { back: () => void }) {
  const opps = useMining("/mining/opportunities", { opportunities } as never)
  const items = ((opps.data as { opportunities: typeof opportunities } | null)?.opportunities) ?? opportunities
  return (
    <>
      <TopBar
        title="Opportunities"
        eyebrow={`Infrastructure intelligence · ${synthBadge(opps.live, opps.loading)}`}
        onBack={back}
        action={
          <button className="icon-button">
            <Icon name="download" />
          </button>
        }
      />
      <main className="screen opportunity-screen">
        <div className="opportunity-map">
          <div className="map-grid" />
          <span className="heat h1" />
          <span className="heat h2" />
          <span className="heat h3" />
          <span className="op-label l1">94</span>
          <span className="op-label l2">87</span>
          <span className="op-label l3">81</span>
          <div className="map-legend">
            Opportunity score <i />
            <span>Low</span>
            <b />
            <span>High</span>
          </div>
        </div>
        <section className="opportunity-sheet">
          <div className="sheet-handle" />
          <div className="sheet-head">
            <div>
              <span className="eyebrow">8 priority zones</span>
              <h1>Gaps worth filling</h1>
            </div>
            <button className="sort-button">
              <Icon name="filter" size={16} /> Filter
            </button>
          </div>
          <div className="opportunity-list">
            {opps.loading && <SkeletonRows n={2} />}
            {items.map((item, i) => (
              <Surface key={item.area}>
                <span className="rank">0{i + 1}</span>
                <div>
                  <span className="eyebrow">{item.area}</span>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </div>
                <div className="score">
                  <strong>{item.score}</strong>
                  <small>/100</small>
                </div>
              </Surface>
            ))}
          </div>
          <Surface className="method-note">
            <Icon name="spark" />
            <span>
              <strong>How scores work</strong>
              <small>
                Demand, competition, traffic and land suitability are combined
                into one decision score.
              </small>
            </span>
            <Icon name="chevron" />
          </Surface>
        </section>
      </main>
    </>
  )
}

function ETL() {
  const etl = useEtl()
  const [running, setRunning] = useState(false)
  const [olapOut, setOlapOut] = useState<string>("Roll-up month · Slice EV Charge · Dice zone=East · Pivot service×zone — tap Run OLAP.")
  const run = async () => {
    setRunning(true)
    const r = await runEtl()
    setRunning(false)
    if (r) etl.retry()
  }
  const runOlap = async () => {
    const r = await olapPost({ operation: "rollup", to_level: "month", metric: "sessions" })
    if (r?.rows?.length) setOlapOut(`${r.explanation} Top: ${JSON.stringify(r.rows[0])} (synthetic)`)
    else setOlapOut("Warehouse empty or backend offline — run ETL first.")
  }
  const d = etl.data
  const jobs = d?.jobs ?? pipelineJobs
  return (
    <>
      <TopBar title="Data systems" eyebrow={`Pipelines · ${synthBadge(etl.live, etl.loading)}`} />
      <main className="screen etl-screen">
        <Surface className="system-health">
          <div className="health-orb">
            <Icon name="check" size={30} />
          </div>
          <div>
            <span className="eyebrow">System status</span>
            <h1>Everything is syncing</h1>
            <p>{d?.finishedAt ? `Last sync ${d.finishedAt.slice(0, 16).replace("T", " ")}` : "Last sync finished at 09:42"}</p>
            <p className="quiet-label">ETL extracted {d?.extracted ?? "—"} · cleaned {d?.cleaned ?? "—"} · rejected {d?.rejected ?? "—"} · loaded {d?.loaded ?? "—"} (synthetic)</p>
            <button className="apply-button" onClick={run} disabled={running} style={{ marginTop: 8 }}>
              {running ? "Running ETL…" : etl.loading ? "Checking warehouse…" : "Run ETL now"}
            </button>
            {!etl.live && !etl.loading && (
              <button className="text-button" onClick={etl.retry}>Retry connection</button>
            )}
          </div>
        </Surface>
        <div className="etl-metrics">
          <div>
            <span>Freshness</span>
            <strong>2m</strong>
            <small>Target &lt; 5m</small>
          </div>
          <div>
            <span>Success rate</span>
            <strong>99.8%</strong>
            <small>Last 30 days</small>
          </div>
          <div>
            <span>Rows today</span>
            <strong>18.1M</strong>
            <small>+6.2% avg.</small>
          </div>
        </div>
        <SectionTitle action={<span className="quiet-label">Live</span>}>
          Pipeline activity
        </SectionTitle>
        <Surface className="pipeline-card">
          {jobs.map((job) => (
            <div className="pipeline-row" key={job.name}>
              <span
                className={`job-status ${
                  job.status === "Delayed" ? "delayed" : ""
                }`}
              >
                <Icon
                  name={job.status === "Delayed" ? "clock" : "check"}
                  size={14}
                />
              </span>
              <span>
                <strong>{job.name}</strong>
                <small>
                  {job.rows} rows · {job.updated}
                </small>
              </span>
              <em>{job.status}</em>
            </div>
          ))}
        </Surface>
        <SectionTitle action={<button className="text-button" onClick={runOlap}>Run OLAP</button>}>
          Warehouse load
        </SectionTitle>
        <Surface className="warehouse-card">
          <div className="warehouse-head">
            <span>
              <Icon name="database" />
              <strong>pitstop_prod</strong>
            </span>
            <em>67% capacity</em>
          </div>
          <div className="storage-bar">
            <i />
          </div>
          <div className="axis">
            <span>4.2 TB used</span>
            <span>6.3 TB total</span>
          </div>
          <div className="warehouse-stats">
            <div>
              <span>Queries / min</span>
              <strong>2,840</strong>
            </div>
            <div>
              <span>Avg. latency</span>
              <strong>184 ms</strong>
            </div>
          </div>
        </Surface>
        <div className="sync-note">
          <Icon name="clock" />
          <span>
            <strong>Next scheduled aggregation</strong>
            <small>Today at 10:00 · in 12 minutes</small>
          </span>
        </div>
        <Surface className="method-note">
          <Icon name="database" />
          <span><strong>OLAP demo</strong><small>{olapOut}</small></span>
        </Surface>
      </main>
    </>
  )
}

function Profile() {
  const [alerts, setAlerts] = useState(true)
  return (
    <>
      <TopBar
        title="Profile"
        eyebrow="Driver & app settings"
        action={
          <button className="icon-button">
            <Icon name="settings" />
          </button>
        }
      />
      <main className="screen profile-screen">
        <div className="profile-head">
          <div className="avatar">
            AK
            <span />
          </div>
          <div>
            <h1>Arjun Kapoor</h1>
            <p>Premium member · Bengaluru</p>
          </div>
          <button>Edit</button>
        </div>
        <Surface className="vehicle-card">
          <div className="vehicle-art">
            <Icon name="car" size={64} />
          </div>
          <div className="vehicle-info">
            <span className="eyebrow">Primary vehicle</span>
            <h2>Hyundai IONIQ 5</h2>
            <p>BLR 08 MK 4821 · Electric</p>
            <div>
              <span>
                Range <strong>326 km</strong>
              </span>
              <span>
                Battery <strong>68%</strong>
              </span>
            </div>
          </div>
          <button>
            <Icon name="chevron" />
          </button>
        </Surface>
        <SectionTitle>Preferences</SectionTitle>
        <Surface className="settings-list">
          <button>
            <span className="setting-icon">
              <Icon name="map" />
            </span>
            <span>
              <strong>Home & work</strong>
              <small>2 saved places</small>
            </span>
            <Icon name="chevron" />
          </button>
          <button>
            <span className="setting-icon">
              <Icon name="bolt" />
            </span>
            <span>
              <strong>Charging preferences</strong>
              <small>CCS2 · Fast charging first</small>
            </span>
            <Icon name="chevron" />
          </button>
          <button>
            <span className="setting-icon">
              <Icon name="bell" />
            </span>
            <span>
              <strong>Mobility alerts</strong>
              <small>Price, demand and maintenance</small>
            </span>
            <label className="mini-switch">
              <input
                type="checkbox"
                checked={alerts}
                onChange={() => setAlerts(!alerts)}
              />
              <i />
            </label>
          </button>
        </Surface>
        <SectionTitle>Account</SectionTitle>
        <Surface className="settings-list">
          <button>
            <span className="setting-icon">
              <Icon name="shield" />
            </span>
            <span>
              <strong>Privacy & data</strong>
              <small>Permissions and data controls</small>
            </span>
            <Icon name="chevron" />
          </button>
          <button>
            <span className="setting-icon">
              <Icon name="download" />
            </span>
            <span>
              <strong>Offline maps</strong>
              <small>Bengaluru · 184 MB</small>
            </span>
            <Icon name="chevron" />
          </button>
          <button>
            <span className="setting-icon">
              <Icon name="more" />
            </span>
            <span>
              <strong>Help & support</strong>
              <small>FAQs, chat and roadside help</small>
            </span>
            <Icon name="chevron" />
          </button>
        </Surface>
        <p className="version">PITSTOP 2.4.0 · Made for the road ahead</p>
      </main>
    </>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home")
  const [direction, setDirection] = useState<"fwd" | "back">("fwd")
  const [selectedStation, setSelectedStation] = useState(stations[0])
  const [radius, setRadius] = useState(5)
  const [kind, setKind] = useState<KindFilter>("All")
  const [minRating, setMinRating] = useState(0)
  const [radiusDragging, setRadiusDragging] = useState(false)
  const settledRadius = useSettled(radius, radiusDragging, duration.medium)
  const screenRef = useRef(screen)

  const navigate = (next: Screen) => {
    if (next === screenRef.current) return
    setDirection(rank(next) >= rank(screenRef.current) ? "fwd" : "back")
    screenRef.current = next
    setScreen(next)
    window.scrollTo({ top: 0, behavior: "auto" })
  }
  const openStation = (station: Station) => {
    setSelectedStation(station)
    navigate("detail")
  }
  const back = () => navigate(tabOf(screen))

  return (
    <div className="app-shell">
      <div className="cutout-safe" aria-hidden="true" />
      <div className="page" key={screen} data-dir={direction}>
        {screen === "home" && (
          <Home
            navigate={navigate}
            openStation={openStation}
            radius={radius}
            settledRadius={settledRadius}
            setRadius={setRadius}
            onRadiusDrag={setRadiusDragging}
            kind={kind}
            setKind={setKind}
            minRating={minRating}
          />
        )}
        {screen === "nearby" && (
          <Nearby
            navigate={navigate}
            openStation={openStation}
            radius={settledRadius}
            kind={kind}
            setKind={setKind}
            minRating={minRating}
          />
        )}
        {screen === "detail" && <Details station={selectedStation} back={back} />}
        {screen === "search" && (
          <SearchFilters
            back={back}
            navigate={navigate}
            radius={radius}
            settledRadius={settledRadius}
            setRadius={setRadius}
            onRadiusDrag={setRadiusDragging}
            kind={kind}
            setKind={setKind}
            minRating={minRating}
            setMinRating={setMinRating}
          />
        )}
        {screen === "analytics" && <Analytics navigate={navigate} />}
        {screen === "mining" && <DataMining back={back} />}
        {screen === "predictions" && <Predictions back={back} />}
        {screen === "opportunities" && <Opportunities back={back} />}
        {screen === "etl" && <ETL />}
        {screen === "profile" && <Profile />}
      </div>
      {!["detail", "search", "mining", "predictions", "opportunities"].includes(
        screen,
      ) && <BottomNav screen={screen} navigate={navigate} />}
    </div>
  )
}
