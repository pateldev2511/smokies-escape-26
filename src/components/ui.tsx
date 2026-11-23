import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IMAGES } from '../data/images'
import type { ImageKey } from '../data/trip'

const BASE = import.meta.env.BASE_URL

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) return void el.classList.add('in')
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))), { rootMargin: '0px 0px -6% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref
}

export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useReveal<HTMLDivElement>()
  return (
    <div ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  )
}

export function Section({ id, index, kicker, title, intro, children, aside }: { id: string; index: string; kicker: string; title: ReactNode; intro?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section id={id} className="relative mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
      <Reveal>
        <div className="flex items-center gap-3">
          <span className="mono text-xs gold">{index}</span>
          <span className="h-px w-10 bg-[var(--line-strong)]" />
          <span className="label">{kicker}</span>
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <h2 className="display max-w-3xl text-[2.25rem] leading-[0.98] sm:text-6xl">{title}</h2>
          {aside}
        </div>
        {intro && <p className="ink2 mt-4 max-w-2xl text-[0.97rem] leading-relaxed sm:text-lg">{intro}</p>}
      </Reveal>
      <div className="mt-8 sm:mt-12">{children}</div>
    </section>
  )
}

export function Photo({ k, alt, className = '', sizes = '(min-width: 768px) 50vw, 100vw', eager = false }: { k?: ImageKey; alt: string; className?: string; sizes?: string; eager?: boolean }) {
  const img = k ? IMAGES[k] : undefined
  const [ok, setOk] = useState(false)
  const pos = /\babsolute\b/.test(className) ? '' : 'relative'
  if (!img) return <NightArt className={`${pos} ${className}`} label={alt} />
  return (
    <div className={`${pos} overflow-hidden ${className}`}>
      {!ok && <div className="skeleton absolute inset-0 !rounded-none" aria-hidden />}
      <img
        src={`${BASE}img/${img.file}-800.webp`}
        srcSet={img.widths.map((w) => `${BASE}img/${img.file}-${w}.webp ${w}w`).join(', ')}
        sizes={sizes}
        alt={alt}
        width={img.w}
        height={img.h}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        decoding="async"
        onLoad={() => setOk(true)}
        className={`h-full w-full object-cover transition-opacity duration-700 ${ok ? 'opacity-100' : 'opacity-0'}`}
        style={{ objectPosition: img.focus ?? 'center' }}
      />
    </div>
  )
}

/** Illustrated pre-dawn sky for the 3:30 AM departure (no photo needed). */
export function NightArt({ className = '', label }: { className?: string; label: string }) {
  const stars = Array.from({ length: 46 }, (_, i) => ({ x: (i * 97) % 400, y: (i * 53) % 120, r: i % 7 === 0 ? 1.4 : 0.7 }))
  return (
    <div className={`overflow-hidden bg-[linear-gradient(180deg,#05090c_0%,#0c1630_55%,#2b2a4a_100%)] ${className}`} role="img" aria-label={label}>
      <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#F7F5EF" opacity={0.35 + (i % 5) * 0.12} />
        ))}
        <path d="M0 150 L60 120 L110 140 L170 100 L230 135 L290 110 L350 130 L400 115 L400 200 L0 200Z" fill="#10251F" />
        <path d="M0 175 L80 150 L150 170 L220 145 L300 168 L400 150 L400 200 L0 200Z" fill="#0b1915" />
        <path d="M40 196 Q 200 150 380 196" stroke="#E8B86D" strokeWidth="1.6" strokeDasharray="1 7" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  )
}

export function ExtLink({ href, children, className = 'btn btn-ghost btn-sm', label }: { href: string; children: ReactNode; className?: string; label?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} aria-label={label}>
      {children}
    </a>
  )
}

export function Note({ tone = 'warn', children }: { tone?: 'warn' | 'info' | 'bad' | 'good'; children: ReactNode }) {
  const c = { warn: 'border-sunset/40 bg-sunset/10', info: 'border-mist/30 bg-mist/10', bad: 'border-red-400/45 bg-red-500/10', good: 'border-emerald-400/40 bg-emerald-500/10' }[tone]
  return <div className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${c}`}>{children}</div>
}

export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

export function Toast({ msg, onDone }: { msg: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!msg) return
    const id = setTimeout(onDone, 3200)
    return () => clearTimeout(id)
  }, [msg, onDone])
  if (!msg) return null
  return (
    <div role="status" className="no-print glass fixed top-[calc(env(safe-area-inset-top)+12px)] left-1/2 z-[80] -translate-x-1/2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-[var(--shadow)]">
      {msg}
    </div>
  )
}
