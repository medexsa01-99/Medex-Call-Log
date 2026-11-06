// WHY: Report module is read-only — it reuses the existing `clinics` and
// `tickets` tables. Nothing in this folder writes to the database, and no
// existing page imports from here, so the module stays isolated.

import { format, getDaysInMonth, subMonths } from 'date-fns'
import type { TicketStatus } from '@/lib/types'

// ── Shapes returned by Supabase selects (see CLINIC_COLS / RECORD_COLS) ──

export interface ReportClinic {
  id: string
  clinic_code: string
  clinic_name: string
  clinic_phone: string | null
  wa_account_no: string | null
  registered_contact: string | null
  support_name: string | null
  city: string | null
  state: string | null
  customer_status: string | null
  mtn_expiry: string | null
  renewal_status: string | null
  product_type: string | null
}

export interface SupportRecord {
  id: string
  ticket_ref: string
  record_type: string
  clinic_code: string | null
  clinic_name: string | null
  created_at: string
  submitted_at: string | null
  pic: string | null
  caller_tel: string | null
  issue: string | null
  my_response: string | null
  created_by_name: string | null
  status: string
  call_duration: number | null
  internal_timeline: string | null
  timeline_from_customer: string | null
  next_step: string | null
  next_step_pic: string | null
  jira_link: string | null
  issue_category: string | null
  issue_type: string | null
}

// Explicit column lists keep payloads small — the Report never loads `*`.
export const CLINIC_COLS = [
  'id', 'clinic_code', 'clinic_name', 'clinic_phone', 'wa_account_no',
  'registered_contact', 'support_name', 'city', 'state', 'customer_status',
  'mtn_expiry', 'renewal_status', 'product_type',
].join(', ')

export const RECORD_COLS = [
  'id', 'ticket_ref', 'record_type', 'clinic_code', 'clinic_name', 'created_at',
  'submitted_at', 'pic', 'caller_tel', 'issue', 'my_response', 'created_by_name',
  'status', 'call_duration', 'internal_timeline', 'timeline_from_customer',
  'next_step', 'next_step_pic', 'jira_link', 'issue_category', 'issue_type',
].join(', ')

// ── Filters ──

export type RangePreset = 'this_month' | 'last_month' | 'last_30' | 'this_year' | 'all' | 'custom'

export interface ReportFilters {
  preset: RangePreset
  from: string // yyyy-MM-dd
  to: string   // yyyy-MM-dd
  status: string
  staff: string
  category: string
  recordType: 'all' | 'call' | 'ticket'
  search: string
}

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_30', label: 'Last 30 Days' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom Range' },
]

const iso = (d: Date) => format(d, 'yyyy-MM-dd')

export function presetRange(preset: RangePreset): { from: string; to: string } {
  const now = new Date()
  const today = iso(now)
  switch (preset) {
    case 'this_month':
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: today }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return { from: iso(start), to: iso(end) }
    }
    case 'last_30': {
      const start = new Date(now)
      start.setDate(start.getDate() - 29)
      return { from: iso(start), to: today }
    }
    case 'this_year':
      return { from: iso(new Date(now.getFullYear(), 0, 1)), to: today }
    case 'all':
      return { from: '', to: '' }
    default:
      return { from: '', to: today }
  }
}

export const DEFAULT_FILTERS: ReportFilters = {
  preset: 'this_month',
  ...presetRange('this_month'),
  status: '',
  staff: '',
  category: '',
  recordType: 'all',
  search: '',
}

/** Records store `created_at` as ISO/UTC — compare on the date part only. */
export const dateKey = (value: string | null | undefined) => (value ? value.slice(0, 10) : '')

export function applyFilters(records: SupportRecord[], f: ReportFilters): SupportRecord[] {
  const q = f.search.trim().toLowerCase()
  return records.filter(r => {
    const d = dateKey(r.created_at)
    if (f.from && d < f.from) return false
    if (f.to && d > f.to) return false
    if (f.status && r.status !== f.status) return false
    if (f.staff && (r.created_by_name || '') !== f.staff) return false
    if (f.category && categoryOf(r) !== f.category) return false
    if (f.recordType !== 'all' && r.record_type !== f.recordType) return false
    if (q) {
      const hay = [
        r.clinic_name, r.pic, r.issue, r.my_response, r.created_by_name,
        r.ticket_ref, r.issue_type, r.issue_category, r.next_step,
      ].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

/** Category label used across the module — never invent data, fall back honestly. */
export function categoryOf(r: SupportRecord): string {
  return (r.issue_category || '').trim() || 'Uncategorised'
}

export function staffOf(r: SupportRecord): string {
  return (r.created_by_name || '').trim() || 'Unknown'
}

// ── Summary ──

export interface ReportSummary {
  total: number
  resolved: number
  inProgress: number
  pendingCustomer: number
  pendingTeam: number
  escalated: number
  escalatedToAdmin: number
  resolutionRate: number
}

export function buildSummary(records: SupportRecord[]): ReportSummary {
  const count = (s: string) => records.filter(r => r.status === s).length
  const total = records.length
  const resolved = count('Resolved')
  return {
    total,
    resolved,
    inProgress: count('In Progress'),
    pendingCustomer: count('Pending Customer'),
    pendingTeam: count('Pending Team'),
    escalated: count('Escalated'),
    escalatedToAdmin: count('Escalated to Admin'),
    resolutionRate: total > 0 ? (resolved / total) * 100 : 0,
  }
}

// ── Analytics buckets ──

export interface Bucket {
  name: string
  value: number
  pct: number
  color: string
}

export const CATEGORY_COLORS = [
  '#38bdf8', '#22c55e', '#a855f7', '#f59e0b', '#ef4444',
  '#14b8a6', '#818cf8', '#f472b6', '#facc15', '#64748b',
]

const groupCount = (records: SupportRecord[], pick: (r: SupportRecord) => string) => {
  const map = new Map<string, number>()
  records.forEach(r => {
    const key = pick(r)
    map.set(key, (map.get(key) || 0) + 1)
  })
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
}

const toBuckets = (entries: [string, number][], total: number, palette: string[]): Bucket[] =>
  entries.map(([name, value], i) => ({
    name,
    value,
    pct: total > 0 ? (value / total) * 100 : 0,
    color: palette[i % palette.length],
  }))

export function categoryBuckets(records: SupportRecord[]): Bucket[] {
  return toBuckets(groupCount(records, categoryOf), records.length, CATEGORY_COLORS)
}

export function categoryOptions(records: SupportRecord[]): string[] {
  return groupCount(records, categoryOf).map(([name]) => name)
}

export function staffBuckets(records: SupportRecord[]): Bucket[] {
  return toBuckets(groupCount(records, staffOf), records.length, CATEGORY_COLORS)
}

export function staffOptions(records: SupportRecord[]): string[] {
  return groupCount(records, staffOf).map(([name]) => name).sort((a, b) => a.localeCompare(b))
}

export const STATUS_HEX: Record<string, string> = {
  'Resolved': '#22c55e',
  'In Progress': '#38bdf8',
  'Pending Customer': '#f59e0b',
  'Pending Team': '#fb923c',
  'Escalated': '#ef4444',
  'Escalated to Admin': '#a855f7',
}

export const STATUS_ORDER: TicketStatus[] = [
  'Resolved', 'In Progress', 'Pending Customer', 'Pending Team', 'Escalated', 'Escalated to Admin',
]

/** Status buckets keep the canonical order (not count order) so colours stay stable. */
export function statusBuckets(records: SupportRecord[]): Bucket[] {
  const total = records.length
  const buckets = STATUS_ORDER.map((s, i) => {
    const value = records.filter(r => r.status === s).length
    return {
      name: s as string,
      value,
      pct: total > 0 ? (value / total) * 100 : 0,
      color: STATUS_HEX[s] || CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }
  })
  // Unknown/legacy status values still show up — never hide real rows.
  const seen = new Set(STATUS_ORDER as string[])
  const extras = groupCount(records.filter(r => !seen.has(r.status)), r => r.status || 'Unknown')
  return [...buckets, ...toBuckets(extras, total, ['#64748b'])]
}

// ── Trend ──

export type TrendGranularity = 'day' | 'week' | 'month'

export interface TrendPoint {
  key: string
  label: string
  value: number
}

/** Groups by day / ISO week (Mon) / month and fills empty periods inside the range. */
export function trendSeries(records: SupportRecord[], granularity: TrendGranularity): TrendPoint[] {
  const keyOf = (d: string) => {
    const date = new Date(d + 'T00:00:00')
    if (granularity === 'day') return d
    if (granularity === 'month') return format(date, 'yyyy-MM')
    const dow = (date.getDay() + 6) % 7 // Monday = 0
    const monday = new Date(date)
    monday.setDate(date.getDate() - dow)
    return format(monday, 'yyyy-MM-dd')
  }
  const labelOf = (key: string) => {
    const date = new Date((granularity === 'month' ? key + '-01' : key) + 'T00:00:00')
    if (granularity === 'month') return format(date, 'MMM yyyy')
    return format(date, 'dd MMM')
  }

  const counts = new Map<string, number>()
  records.forEach(r => {
    const d = dateKey(r.created_at)
    if (!d) return
    const k = keyOf(d)
    counts.set(k, (counts.get(k) || 0) + 1)
  })

  if (counts.size === 0) return []

  const sorted = Array.from(counts.keys()).sort()
  const first = new Date((granularity === 'month' ? sorted[0] + '-01' : sorted[0]) + 'T00:00:00')
  const last = new Date((granularity === 'month' ? sorted[sorted.length - 1] + '-01' : sorted[sorted.length - 1]) + 'T00:00:00')

  // Walk the real calendar so quiet days/weeks are visible as zero, not gaps.
  const out: TrendPoint[] = []
  const cursor = new Date(first)
  let guard = 0
  while (cursor <= last && guard < 800) {
    const key = granularity === 'month' ? format(cursor, 'yyyy-MM') : format(cursor, 'yyyy-MM-dd')
    out.push({ key, label: labelOf(key), value: counts.get(key) || 0 })
    if (granularity === 'day') cursor.setDate(cursor.getDate() + 1)
    else if (granularity === 'week') cursor.setDate(cursor.getDate() + 7)
    else cursor.setMonth(cursor.getMonth() + 1)
    guard++
  }
  return out
}

export interface MonthPoint {
  day: number
  thisMonth: number
  lastMonth: number
}

/** Day-by-day comparison of a month against the one before it. */
export function monthComparison(records: SupportRecord[], month: Date): MonthPoint[] {
  const thisKey = format(month, 'yyyy-MM')
  const prevKey = format(subMonths(month, 1), 'yyyy-MM')
  const days = Math.max(getDaysInMonth(month), getDaysInMonth(subMonths(month, 1)))
  const points: MonthPoint[] = Array.from({ length: days }, (_, i) => ({
    day: i + 1, thisMonth: 0, lastMonth: 0,
  }))
  records.forEach(r => {
    const d = dateKey(r.created_at)
    if (!d) return
    const day = Number(d.slice(8, 10))
    const monthKey = d.slice(0, 7)
    if (!day || day > days) return
    if (monthKey === thisKey) points[day - 1].thisMonth += 1
    else if (monthKey === prevKey) points[day - 1].lastMonth += 1
  })
  return points
}

// ── Related work ──

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

/**
 * Related work = other records for the same clinic with the same issue type
 * within 30 days. Real data only; ids are used to keep lookups cheap.
 */
export function relatedMap(records: SupportRecord[]): Record<string, SupportRecord[]> {
  const byType = new Map<string, SupportRecord[]>()
  records.forEach(r => {
    if (!r.issue_type) return
    const list = byType.get(r.issue_type) || []
    list.push(r)
    byType.set(r.issue_type, list)
  })
  const out: Record<string, SupportRecord[]> = {}
  records.forEach(r => {
    if (!r.issue_type) { out[r.id] = []; return }
    const t = new Date(r.created_at).getTime()
    out[r.id] = (byType.get(r.issue_type) || []).filter(o =>
      o.id !== r.id && Math.abs(new Date(o.created_at).getTime() - t) <= THIRTY_DAYS
    )
  })
  return out
}

// ── Formatting ──

export function fmtDateTime(value: string | null | undefined): string {
  if (!value) return '-'
  const d = new Date(value)
  return isNaN(d.getTime()) ? '-' : format(d, 'dd/MM/yyyy HH:mm')
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return '-'
  const d = new Date(value)
  return isNaN(d.getTime()) ? '-' : format(d, 'dd/MM/yyyy')
}

export function fmtMinutes(minutes: number | null | undefined): string {
  if (!minutes) return '-'
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function pctLabel(n: number): string {
  return `${n.toFixed(1)}%`
}

/** Clinic status pill — CRM `customer_status` drives it (ACTIVE/INACTIVE/…). */
export function clinicStatusTone(status: string | null): { label: string; tone: 'active' | 'inactive' | 'unknown' } {
  const s = (status || '').trim()
  if (!s) return { label: 'Not Set', tone: 'unknown' }
  const up = s.toUpperCase()
  if (up.includes('ACTIVE') && !up.includes('INACTIVE')) return { label: s, tone: 'active' }
  if (up.includes('INACTIVE') || up.includes('EXPIRED') || up.includes('CLOSE')) return { label: s, tone: 'inactive' }
  return { label: s, tone: 'unknown' }
}

export function monthLabel(date: Date): string {
  return format(date, 'MMMM yyyy')
}

export function monthValue(date: Date): string {
  return format(date, 'yyyy-MM')
}
