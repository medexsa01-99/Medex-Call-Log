'use client'

// WHY: Small presentational pieces shared inside the Report module only.
// Everything is styled through the scoped .csr-* classes in report.css so the
// rest of the app is never affected.

import type { ReactNode } from 'react'
import { STATUS_HEX } from './report-utils'

// ── Icons (stroke 1.6, 18px default) ──

type IconProps = { className?: string; size?: number }

const base = (size: number) => ({
  width: size,
  height: size,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
})

export const IcSearch = ({ className, size = 16 }: IconProps) => (
  <svg className={className} {...base(size)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
)
export const IcCalendar = ({ className, size = 16 }: IconProps) => (
  <svg className={className} {...base(size)}><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M8 3v3m8-3v3M3 9.5h18" /></svg>
)
export const IcDownload = ({ className, size = 16 }: IconProps) => (
  <svg className={className} {...base(size)}><path d="M12 3v11m0 0 4-4m-4 4-4-4" /><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13A1.5 1.5 0 0 0 20 19.5V17" /></svg>
)
export const IcChevronDown = ({ className, size = 16 }: IconProps) => (
  <svg className={className} {...base(size)}><path d="m6 9 6 6 6-6" /></svg>
)
export const IcChevronRight = ({ className, size = 16 }: IconProps) => (
  <svg className={className} {...base(size)}><path d="m9 6 6 6-6 6" /></svg>
)
export const IcChevronLeft = ({ className, size = 16 }: IconProps) => (
  <svg className={className} {...base(size)}><path d="m15 6-6 6 6 6" /></svg>
)
export const IcClose = ({ className, size = 16 }: IconProps) => (
  <svg className={className} {...base(size)}><path d="M6 6l12 12M18 6 6 18" /></svg>
)
export const IcFilter = ({ className, size = 16 }: IconProps) => (
  <svg className={className} {...base(size)}><path d="M3 5h18l-7 8v6l-4 2v-8Z" /></svg>
)
export const IcBuilding = ({ className, size = 16 }: IconProps) => (
  <svg className={className} {...base(size)}><path d="M4 21V6.2a1.2 1.2 0 0 1 .9-1.16l9-2.4A1.2 1.2 0 0 1 15.4 3.8V21" /><path d="M15.4 9H19a1 1 0 0 1 1 1v11" /><path d="M2.5 21h19" /><path d="M7.6 8h2.4m-2.4 4h2.4m-2.4 4h2.4" /></svg>
)
export const IcPhone = ({ className, size = 16 }: IconProps) => (
  <svg className={className} {...base(size)}><path d="M5 3.5h3l1.4 3.6-2 1.4a11.5 11.5 0 0 0 5.1 5.1l1.4-2 3.6 1.4v3a2.5 2.5 0 0 1-2.7 2.5A15.5 15.5 0 0 1 2.5 6.2 2.5 2.5 0 0 1 5 3.5Z" /></svg>
)
export const IcWhatsApp = ({ className, size = 16 }: IconProps) => (
  <svg className={className} {...base(size)}><path d="M20.5 11.6a8.5 8.5 0 0 1-12.7 7.4L3.5 20.5l1.6-4.1A8.5 8.5 0 1 1 20.5 11.6Z" /><path d="M8.8 8.4c.4-.1.9 0 1.1.4l.7 1.2c.15.25.1.55-.1.75l-.5.5c.5 1.1 1.4 2 2.5 2.5l.5-.5c.2-.2.5-.25.75-.1l1.2.7c.4.2.5.7.4 1.1-.3.9-1.2 1.4-2.1 1.3-2.9-.4-5.2-2.7-5.6-5.6-.1-.9.4-1.8 1.3-2.1Z" /></svg>
)
export const IcUser = ({ className, size = 16 }: IconProps) => (
  <svg className={className} {...base(size)}><circle cx="12" cy="8" r="3.6" /><path d="M4.8 20.5a7.2 7.2 0 0 1 14.4 0" /></svg>
)
export const IcClock = ({ className, size = 16 }: IconProps) => (
  <svg className={className} {...base(size)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></svg>
)
export const IcCheck = ({ className, size = 16 }: IconProps) => (
  <svg className={className} {...base(size)}><circle cx="12" cy="12" r="8.5" /><path d="m8.3 12.2 2.5 2.5 4.9-5" /></svg>
)
export const IcAlert = ({ className, size = 16 }: IconProps) => (
  <svg className={className} {...base(size)}><path d="M12 3.6 21 19.5H3Z" /><path d="M12 9.5v4.2M12 16.6h.01" /></svg>
)
export const IcRefresh = ({ className, size = 16 }: IconProps) => (
  <svg className={className} {...base(size)}><path d="M20 11a8 8 0 1 0-2.6 6" /><path d="M20 4.5V11h-6.2" /></svg>
)
export const IcExternal = ({ className, size = 16 }: IconProps) => (
  <svg className={className} {...base(size)}><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M19 14.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V6.5A1.5 1.5 0 0 1 5 5h4.5" /></svg>
)
export const IcChart = ({ className, size = 16 }: IconProps) => (
  <svg className={className} {...base(size)}><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8.5 16V11m4 5V7.5m4 8.5v-6" /></svg>
)
export const IcDocPdf = ({ className, size = 16 }: IconProps) => (
  <svg className={className} {...base(size)}><path d="M6 3h7l5 5v13H6Z" /><path d="M13 3v5h5" /><path d="M9 17v-4h1.5a1.5 1.5 0 0 1 0 3H9m5-3h2" /></svg>
)
export const IcDocSheet = ({ className, size = 16 }: IconProps) => (
  <svg className={className} {...base(size)}><rect x="3.5" y="4" width="17" height="16" rx="2" /><path d="M3.5 9.5h17M9.5 9.5V20M3.5 15h17" /></svg>
)
export const IcSparkle = ({ className, size = 16 }: IconProps) => (
  <svg className={className} {...base(size)}><path d="M12 3.5l1.9 4.7 4.7 1.9-4.7 1.9L12 16.7l-1.9-4.7L5.4 10l4.7-1.9Z" /><path d="M18.5 16.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z" /></svg>
)
export const IcStethoscope = ({ className, size = 22 }: IconProps) => (
  <svg className={className} {...base(size)}><path d="M5 3v5.5a4 4 0 0 0 8 0V3" /><path d="M5 3h2m6 0h2" /><path d="M9 12.5v3a4.5 4.5 0 0 0 9 0V13" /><circle cx="18" cy="11" r="1.8" /></svg>
)

// ── Status pill ──

const STATUS_TONE: Record<string, string> = {
  'Resolved': 'green',
  'In Progress': 'blue',
  'Pending Customer': 'amber',
  'Pending Team': 'orange',
  'Escalated': 'red',
  'Escalated to Admin': 'violet',
}

export function StatusPill({ status }: { status: string }) {
  const tone = STATUS_TONE[status] || 'grey'
  return (
    <span className={`csr-pill csr-pill--${tone}`}>
      <span className="csr-dot" style={{ background: STATUS_HEX[status] || '#94a3b8' }} />
      {status || 'Unknown'}
    </span>
  )
}

// ── Card ──

export function SectionCard({
  title, icon, meta, children, className = '',
}: {
  title: string
  icon?: ReactNode
  meta?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`csr-card ${className}`}>
      <div className="csr-card-head">
        <h2 className="csr-card-title">{icon}{title}</h2>
        {meta ? <span className="csr-card-meta">{meta}</span> : null}
      </div>
      {children}
    </section>
  )
}

// ── Stat card ──

export function StatCard({
  label, value, foot, icon, color,
}: {
  label: string
  value: number | string
  foot?: string
  icon: ReactNode
  color: string
}) {
  return (
    <div className="csr-stat">
      <span className="csr-stat-icon" style={{ background: color, boxShadow: `0 10px 24px -14px ${color}` }}>
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="csr-stat-label">{label}</div>
        <div className="csr-stat-value">{value}</div>
        {foot ? <div className="csr-stat-foot">{foot}</div> : null}
      </div>
    </div>
  )
}

// ── Select ──

export function RSelect({
  value, onChange, options, placeholder, title, className = '',
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  title?: string
  className?: string
}) {
  return (
    <select
      className={`csr-select ${className}`}
      value={value}
      onChange={e => onChange(e.target.value)}
      title={title}
      aria-label={title}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

// ── Legend row with bar ──

export function LegendBar({ name, value, pct, color }: { name: string; value: number; pct: number; color: string }) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <div className="csr-legend-row">
        <span className="csr-dot" style={{ background: color }} />
        <span className="csr-legend-name">{name}</span>
        <span className="csr-legend-val">{value}</span>
        <span className="csr-legend-pct">{pct.toFixed(1)}%</span>
      </div>
      <div className="csr-bar-track">
        <div className="csr-bar-fill" style={{ width: `${Math.min(100, Math.max(2, pct))}%`, background: color }} />
      </div>
    </div>
  )
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <div className="csr-empty">{children}</div>
}
