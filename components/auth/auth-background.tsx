'use client'

import { useEffect, useRef } from 'react'

/**
 * Silky mesh-gradient background for the auth pages.
 *
 * Two radial halos + a diagonal "fold" + a turbulence noise overlay. A
 * subtle parallax follows the cursor on desktop; disabled for
 * `prefers-reduced-motion` and absent on touch (no mousemove fired).
 */
export function AuthBackground() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !ref.current) return

    const el = ref.current
    let raf = 0
    let targetX = 0
    let targetY = 0
    let currentX = 0
    let currentY = 0

    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2
      const y = (e.clientY / window.innerHeight - 0.5) * 2
      targetX = x * 30
      targetY = y * 30
    }

    const tick = () => {
      currentX += (targetX - currentX) * 0.05
      currentY += (targetY - currentY) * 0.05
      el.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove)
    tick()

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div ref={ref} className="absolute -inset-[20%]">
        <svg
          className="size-full opacity-60"
          viewBox="0 0 1200 1200"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="silk-1" cx="85%" cy="15%" r="60%">
              <stop offset="0%" stopColor="#3F3F46" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#1F1F23" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0A0A0A" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="silk-2" cx="10%" cy="90%" r="55%">
              <stop offset="0%" stopColor="#134E4A" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#0A0A0A" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0A0A0A" stopOpacity="0" />
            </radialGradient>

            <filter id="silk-noise">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.012 0.04"
                numOctaves="2"
                seed="3"
              />
              <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.15 0" />
              <feComposite in2="SourceGraphic" operator="in" />
            </filter>

            <linearGradient id="silk-fold" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="40%" stopColor="#0A0A0A" stopOpacity="0" />
              <stop offset="55%" stopColor="#52525B" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#71717A" stopOpacity="0.18" />
              <stop offset="65%" stopColor="#52525B" stopOpacity="0.25" />
              <stop offset="80%" stopColor="#0A0A0A" stopOpacity="0" />
            </linearGradient>
          </defs>

          <rect width="100%" height="100%" fill="url(#silk-1)" />
          <rect width="100%" height="100%" fill="url(#silk-2)" />
          <rect width="100%" height="100%" fill="url(#silk-fold)" />
          <rect width="100%" height="100%" filter="url(#silk-noise)" opacity="0.5" />
        </svg>
      </div>

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(10,10,10,0.6) 100%)',
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E\")",
        }}
      />
    </div>
  )
}
