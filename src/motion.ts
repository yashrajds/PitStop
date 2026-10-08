import { useEffect, useRef, useState } from "react"

/** Durations in ms (150 / 300 / 500). */
export const duration = { short: 150, medium: 300, long: 500 } as const

/** Spring tokens: damping ratio + stiffness (mass 1), same model as Compose's spring(). */
export const springs = {
  snappy: { damping: 0.7, stiffness: 800 },
  bouncy: { damping: 0.55, stiffness: 400 },
  gentle: { damping: 0.9, stiffness: 200 },
} as const

/** Emphasized easing: cubic-bezier(0.2, 0, 0, 1). */
export const emphasized = "cubic-bezier(0.2, 0, 0, 1)"

type Spring = { damping: number; stiffness: number }

/** Samples the spring step response into a CSS linear() easing and a settle time. */
function springToCss({ damping: z, stiffness: k }: Spring) {
  const w = Math.sqrt(k)
  const wd = w * Math.sqrt(1 - z * z)
  const settle = Math.min(1.6, Math.log(500) / (z * w))
  const n = 48
  const pts: string[] = []
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * settle
    const x =
      1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t))
    pts.push((i === n ? 1 : x).toFixed(4))
  }
  return { easing: `linear(${pts.join(",")})`, ms: Math.round(settle * 1000) }
}

/** Publishes every token as a CSS custom property so stylesheets share one source of truth. */
export function installMotionTokens() {
  const root = document.documentElement.style
  root.setProperty("--dur-short", `${duration.short}ms`)
  root.setProperty("--dur-medium", `${duration.medium}ms`)
  root.setProperty("--dur-long", `${duration.long}ms`)
  root.setProperty("--ease-emphasized", emphasized)
  for (const [name, spring] of Object.entries(springs)) {
    const { easing, ms } = springToCss(spring)
    root.setProperty(`--spring-${name}`, easing)
    root.setProperty(`--spring-${name}-dur`, `${ms}ms`)
  }
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** Light haptic tick where the platform supports it. */
export function haptic(ms = 8) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms)
}

/** Inline style for staggered entrances: pass the item index and per-item step in ms. */
export const stagger = (index: number, stepMs: number, baseMs = 0) =>
  ({ "--delay": `${baseMs + index * stepMs}ms` }) as React.CSSProperties

/** Animates a number from 0 (or its previous value) to `target`. */
export function useCountUp(target: number, ms: number = duration.long) {
  const [value, setValue] = useState(prefersReducedMotion() ? target : 0)
  const from = useRef(value)
  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target)
      return
    }
    const start = performance.now()
    const origin = from.current
    let frame = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      const next = origin + (target - origin) * eased
      from.current = next
      setValue(Math.round(next))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, ms])
  return value
}

/** Returns `value` only after it has stopped changing for `delay` ms and no drag is active. */
export function useSettled<T>(value: T, active: boolean, delay = 300) {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    if (active) return
    const id = window.setTimeout(() => setSettled(value), delay)
    return () => window.clearTimeout(id)
  }, [value, active, delay])
  return settled
}

/** "down" once the user scrolls down past a threshold, "up" when they scroll back. */
export function useScrollDirection(threshold = 8) {
  const [dir, setDir] = useState<"up" | "down">("up")
  useEffect(() => {
    let last = window.scrollY
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        if (Math.abs(y - last) > threshold) {
          setDir(y > last && y > 40 ? "down" : "up")
          last = y
        }
        ticking = false
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [threshold])
  return dir
}
