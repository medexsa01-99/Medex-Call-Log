'use client'

// WHY: Analytics for the Clinic Support Report. Every series is derived from
// the real `tickets` rows loaded for the selected clinic — no placeholders.

import {
  Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { Bucket, MonthPoint, TrendPoint } from './report-utils'
import { LegendBar } from './ReportUI'

const TOOLTIP_STYLE = {
  background: 'rgba(9, 15, 30, 0.97)',
  border: '1px solid rgba(56, 189, 248, 0.35)',
  borderRadius: 10,
  color: '#e7edff',
  fontSize: 11,
  padding: '6px 9px',
  boxShadow: '0 18px 40px -22px rgba(2, 6, 23, 0.95)',
} as const

const AXIS_TICK = { fontSize: 9.5, fill: '#6f81ab' } as const

export function CategoryDonut({ data }: { data: Bucket[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) {
    return <div className="csr-empty">No categorised records in this selection</div>
  }
  return (
    <div>
      <div style={{ position: 'relative', height: 168 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={2}
              stroke="rgba(7, 11, 23, 0.9)"
              strokeWidth={2}
            >
              {data.map(d => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#e7edff' }} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          pointerEvents: 'none', textAlign: 'center',
        }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{total}</div>
            <div style={{ fontSize: 9.5, color: '#6f81ab', marginTop: 2 }}>Total</div>
          </div>
        </div>
      </div>
      <div className="csr-legend" style={{ marginTop: 6 }}>
        {data.slice(0, 6).map(d => (
          <div key={d.name} className="csr-legend-row">
            <span className="csr-dot" style={{ background: d.color }} />
            <span className="csr-legend-name">{d.name}</span>
            <span className="csr-legend-val">{d.value}</span>
            <span className="csr-legend-pct">({d.pct.toFixed(1)}%)</span>
          </div>
        ))}
        {data.length > 6 && (
          <div className="csr-legend-row csr-muted">+{data.length - 6} more categories</div>
        )}
      </div>
    </div>
  )
}

/** Month-vs-month daily comparison (used by the "This Month / Last Month" toggle). */
export function MonthCompareChart({ points }: { points: MonthPoint[] }) {
  if (points.length === 0) return <div className="csr-empty">No data for these months</div>
  return (
    <div style={{ height: 186 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="csrThis" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="csrLast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#a855f7" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={4} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={34} />
          <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#e7edff' }} labelFormatter={(v) => `Day ${v}`} />
          <Area type="monotone" dataKey="lastMonth" name="Last month" stroke="#a855f7" strokeWidth={1.6} fill="url(#csrLast)" />
          <Area type="monotone" dataKey="thisMonth" name="This month" stroke="#38bdf8" strokeWidth={2} fill="url(#csrThis)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Single-series trend for the selected range (day / week / month). */
export function PeriodTrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) return <div className="csr-empty">No activity in this range</div>
  return (
    <div style={{ height: 186 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="csrTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={34} />
          <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#e7edff' }} />
          <Area type="monotone" dataKey="value" name="Records" stroke="#22d3ee" strokeWidth={2} fill="url(#csrTrend)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function StaffBarChart({ data }: { data: Bucket[] }) {
  if (data.length === 0) return <div className="csr-empty">No staff activity in this selection</div>
  const rows = data.slice(0, 8)
  return (
    <div style={{ height: Math.max(140, rows.length * 34) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 14, left: 4, bottom: 0 }}>
          <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10, fill: '#a9b8dd' }}
            axisLine={false}
            tickLine={false}
            width={82}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#e7edff' }} cursor={{ fill: 'rgba(59,130,246,0.08)' }} />
          <Bar dataKey="value" name="Records" radius={[0, 5, 5, 0]} barSize={13}>
            {rows.map(d => <Cell key={d.name} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function StatusDistribution({ data }: { data: Bucket[] }) {
  const visible = data.filter(d => d.value > 0)
  if (visible.length === 0) return <div className="csr-empty">No records in this selection</div>
  return (
    <div className="csr-legend" style={{ gap: 10 }}>
      {visible.map(d => <LegendBar key={d.name} {...d} />)}
    </div>
  )
}
