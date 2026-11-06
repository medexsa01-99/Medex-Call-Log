'use client'

// WHY: Clinic Support Report — a read-only reporting surface on top of the
// existing `clinics` (CRM) and `tickets` (Call Log / History) tables.
// Nothing here writes to the database, and every style is scoped to .csr-*,
// so the rest of the app is untouched.

import './report.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { ClinicPanel, ClinicSearchBar, clinicKey } from '@/components/report/ClinicSearch'
import { SupportHistory } from '@/components/report/SupportHistory'
import { MonthlyReportModal } from '@/components/report/MonthlyReportModal'
import { CategoryDonut, MonthCompareChart, PeriodTrendChart, StaffBarChart, StatusDistribution } from '@/components/report/ReportCharts'
import {
  EmptyHint, IcAlert, IcBuilding, IcCalendar, IcChart, IcCheck, IcChevronDown, IcClock,
  IcDocPdf, IcDocSheet, IcDownload, IcExternal, IcPhone, IcRefresh, IcSearch,
  IcSparkle, IcStethoscope, IcUser, IcWhatsApp, SectionCard, StatCard,
} from '@/components/report/ReportUI'
import { exportReportExcel, exportReportPdf } from '@/components/report/report-export'
import {
  CLINIC_COLS, DEFAULT_FILTERS, RECORD_COLS, RANGE_PRESETS, STATUS_ORDER,
  applyFilters, buildSummary, categoryBuckets, categoryOptions, clinicStatusTone,
  fmtDate, monthComparison, monthLabel, pctLabel, presetRange, relatedMap,
  staffBuckets, staffOptions, statusBuckets, trendSeries,
  type RangePreset, type ReportClinic, type ReportFilters, type SupportRecord, type TrendGranularity,
} from '@/components/report/report-utils'

const CHUNK = 1000

type Tab = 'history' | 'issues' | 'performance'
type TrendView = 'compare' | TrendGranularity

export default function ClinicSupportReportPage() {
  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()

  const [clinics, setClinics] = useState<ReportClinic[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loadingClinics, setLoadingClinics] = useState(true)
  const [selected, setSelected] = useState<ReportClinic | null>(null)
  const [records, setRecords] = useState<SupportRecord[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS)
  const [clinicQuery, setClinicQuery] = useState('')
  const [tab, setTab] = useState<Tab>('history')
  const [trendView, setTrendView] = useState<TrendView>('compare')
  const [monthlyOpen, setMonthlyOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [generatedBy, setGeneratedBy] = useState('Support Team')
  const exportRef = useRef<HTMLDivElement>(null)

  // ── Load clinics + per-clinic record counts once ──

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoadingClinics(true)
      try {
        const clinicRows: ReportClinic[] = []
        for (let page = 0; page < 20; page++) {
          const { data, error } = await supabase
            .from('clinics')
            .select(CLINIC_COLS)
            .order('clinic_name')
            .range(page * CHUNK, page * CHUNK + CHUNK - 1)
          if (error) throw error
          if (!data || data.length === 0) break
          clinicRows.push(...(data as unknown as ReportClinic[]))
          if (data.length < CHUNK) break
        }

        const byCode: Record<string, number> = {}
        const byName: Record<string, number> = {}
        for (let page = 0; page < 30; page++) {
          const { data, error } = await supabase
            .from('tickets')
            .select('clinic_code, clinic_name')
            .range(page * CHUNK, page * CHUNK + CHUNK - 1)
          if (error) throw error
          if (!data || data.length === 0) break
          ;(data as unknown as { clinic_code: string | null; clinic_name: string | null }[]).forEach(row => {
            if (row.clinic_code) byCode[row.clinic_code] = (byCode[row.clinic_code] || 0) + 1
            if (row.clinic_name) byName[row.clinic_name] = (byName[row.clinic_name] || 0) + 1
          })
          if (data.length < CHUNK) break
        }

        if (cancelled) return
        const map: Record<string, number> = {}
        clinicRows.forEach(c => {
          // Rows may keep only the name snapshot, so fall back to the name count.
          map[clinicKey(c)] = (c.clinic_code ? byCode[c.clinic_code] || 0 : 0) || byName[c.clinic_name] || 0
        })
        setClinics(clinicRows)
        setCounts(map)
      } catch (err) {
        if (!cancelled) toast(`Could not load clinics: ${(err as Error).message}`, 'error')
      } finally {
        if (!cancelled) setLoadingClinics(false)
      }
    }

    void run()
    return () => { cancelled = true }
  }, [supabase, toast])

  // ── Who is generating the report (used in exports) ──

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data } = await supabase.auth.getSession()
      const uid = data.session?.user.id
      if (!uid) return
      const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', uid).single()
      const name = profile?.display_name
      if (!cancelled && name) setGeneratedBy(name)
    })()
    return () => { cancelled = true }
  }, [supabase])

  // ── Load every support record for the selected clinic ──

  const loadRecords = useCallback(async (clinic: ReportClinic) => {
    setLoadingRecords(true)
    try {
      const seen = new Set<string>()
      const rows: SupportRecord[] = []

      const pull = async (column: 'clinic_code' | 'clinic_name', value: string, maxPages: number) => {
        for (let page = 0; page < maxPages; page++) {
          const { data, error } = await supabase
            .from('tickets')
            .select(RECORD_COLS)
            .eq(column, value)
            .order('created_at', { ascending: false })
            .range(page * CHUNK, page * CHUNK + CHUNK - 1)
          if (error) throw error
          if (!data || data.length === 0) break
          ;(data as unknown as SupportRecord[]).forEach(row => {
            if (seen.has(row.id)) return
            seen.add(row.id)
            rows.push(row)
          })
          if (data.length < CHUNK) break
        }
      }

      if (clinic.clinic_code) await pull('clinic_code', clinic.clinic_code, 8)
      // Historical rows keep a name snapshot — pick up any that lost their code.
      if (clinic.clinic_name) await pull('clinic_name', clinic.clinic_name, 4)

      rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      setRecords(rows)
    } catch (err) {
      setRecords([])
      toast(`Could not load support records: ${(err as Error).message}`, 'error')
    } finally {
      setLoadingRecords(false)
    }
  }, [supabase, toast])

  const selectClinic = useCallback((clinic: ReportClinic) => {
    setSelected(clinic)
    setClinicQuery(clinic.clinic_name)
    setFilters(DEFAULT_FILTERS)
    setTab('history')
    void loadRecords(clinic)
  }, [loadRecords])

  useEffect(() => {
    if (!exportOpen) return
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [exportOpen])

  // ── Derived data (all from real rows) ──

  const filtered = useMemo(() => applyFilters(records, filters), [records, filters])
  const summary = useMemo(() => buildSummary(filtered), [filtered])
  const categories = useMemo(() => categoryBuckets(filtered), [filtered])
  const staffRows = useMemo(() => staffBuckets(filtered), [filtered])
  const statusRows = useMemo(() => statusBuckets(filtered), [filtered])
  const relatedByRecord = useMemo(() => relatedMap(records), [records])
  const trendPoints = useMemo(
    () => trendView === 'compare' ? [] : trendSeries(filtered, trendView),
    [filtered, trendView]
  )
  const comparePoints = useMemo(() => monthComparison(records, new Date()), [records])
  const allCategories = useMemo(() => categoryOptions(records), [records])
  const allStaff = useMemo(() => staffOptions(records), [records])

  const filterSummary = useMemo(() => {
    const range = filters.from || filters.to
      ? `${filters.from ? fmtDate(filters.from) : 'start'} → ${filters.to ? fmtDate(filters.to) : 'today'}`
      : 'All time'
    return [
      range,
      filters.status || 'All statuses',
      filters.staff || 'All staff',
      filters.category || 'All categories',
      filters.recordType === 'all' ? 'Calls + tickets' : filters.recordType === 'call' ? 'Call logs only' : 'Tickets only',
      filters.search ? `Search: ${filters.search}` : null,
    ].filter(Boolean).join(' · ')
  }, [filters])

  const exportPayload = useMemo(() => ({
    clinic: selected,
    filterSummary,
    records: filtered,
    summary,
    categories,
    staff: staffRows,
    statuses: statusRows,
    generatedBy,
  }), [selected, filterSummary, filtered, summary, categories, staffRows, statusRows, generatedBy])

  const openRecord = useCallback((record: SupportRecord) => {
    const url = `/tickets/${record.id}`
    // Popup blockers return null instead of throwing — never let the row look dead.
    if (!window.open(url, '_blank')) window.location.href = url
  }, [])

  const setPreset = (preset: RangePreset) => {
    if (preset === 'custom') { setFilters(f => ({ ...f, preset })); return }
    setFilters(f => ({ ...f, preset, ...presetRange(preset) }))
  }

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setClinicQuery(selected ? selected.clinic_name : '')
  }

  const clinicTone = clinicStatusTone(selected?.customer_status ?? null)
  const hasSelection = !!selected

  return (
    <div className="csr-root">
      {/* ── Header ── */}
      <header className="csr-header">
        <span className="csr-logo"><IcStethoscope size={24} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="csr-title">Clinic Support Report</h1>
          <p className="csr-sub">View support activities, performance and history for each clinic.</p>
        </div>
        {hasSelection && (
          <span className="csr-pill csr-pill--cyan" style={{ height: 26 }}>
            {selected?.clinic_code || 'No code'}
          </span>
        )}
      </header>

      {/* ── Filter bar ── */}
      <div className="csr-filterbar">
        <ClinicSearchBar
          clinics={clinics}
          counts={counts}
          query={clinicQuery}
          onQueryChange={setClinicQuery}
          onSelect={selectClinic}
          selected={selected}
          loading={loadingClinics}
        />

        <div className="csr-date-range">
          <span style={{ color: '#60a5fa', display: 'flex' }}><IcCalendar size={14} /></span>
          <input
            type="date"
            value={filters.from}
            onChange={e => setFilters(f => ({ ...f, preset: 'custom', from: e.target.value }))}
            aria-label="From date"
          />
          <span>→</span>
          <input
            type="date"
            value={filters.to}
            onChange={e => setFilters(f => ({ ...f, preset: 'custom', to: e.target.value }))}
            aria-label="To date"
          />
        </div>

        <select
          className="csr-select"
          value={filters.preset}
          onChange={e => setPreset(e.target.value as RangePreset)}
          aria-label="Date range preset"
          style={{ maxWidth: 132 }}
        >
          {RANGE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>

        <select
          className="csr-select"
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          aria-label="Status filter"
        >
          <option value="">All Status</option>
          {STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          className="csr-select"
          value={filters.staff}
          onChange={e => setFilters(f => ({ ...f, staff: e.target.value }))}
          aria-label="Staff filter"
        >
          <option value="">All Staff</option>
          {allStaff.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          className="csr-select"
          value={filters.category}
          onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
          aria-label="Issue category filter"
        >
          <option value="">All Issue Category</option>
          {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <button type="button" className="csr-btn csr-btn--reset" onClick={resetFilters}>
          <IcRefresh size={14} /> Reset
        </button>

        <div ref={exportRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className="csr-btn csr-btn--primary"
            onClick={() => setExportOpen(v => !v)}
            disabled={!hasSelection}
          >
            <IcDownload size={14} /> Export <IcChevronDown size={13} />
          </button>
          {exportOpen && (
            <div className="csr-suggest" style={{ minWidth: 210, left: 'auto', right: 0 }}>
              <button
                type="button"
                className="csr-suggest-item"
                onClick={() => { setExportOpen(false); exportReportPdf(exportPayload) }}
              >
                <IcDocPdf size={14} /> Export PDF
              </button>
              <button
                type="button"
                className="csr-suggest-item"
                onClick={() => { setExportOpen(false); void exportReportExcel(exportPayload) }}
              >
                <IcDocSheet size={14} /> Export Excel
              </button>
              <button
                type="button"
                className="csr-suggest-item"
                onClick={() => { setExportOpen(false); setMonthlyOpen(true) }}
              >
                <IcSparkle size={14} /> Generate Monthly Report
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="csr-grid">
        {/* Left: clinics */}
        <div className="csr-stack">
          <ClinicPanel
            clinics={clinics}
            counts={counts}
            selectedId={selected?.id ?? null}
            onSelect={selectClinic}
          />
        </div>

        {/* Center */}
        <div className="csr-stack">
          <div className="csr-stats">
            <StatCard label="Total Calls" value={summary.total} foot={`${filtered.length} in range`} icon={<IcPhone size={17} />} color="#2563eb" />
            <StatCard label="Resolved" value={summary.resolved} foot={`${pctLabel(summary.resolutionRate)} resolution rate`} icon={<IcCheck size={17} />} color="#16a34a" />
            <StatCard label="In Progress" value={summary.inProgress} icon={<IcClock size={17} />} color="#0891b2" />
            <StatCard label="Pending Customer" value={summary.pendingCustomer} foot={`${summary.pendingTeam} pending team`} icon={<IcAlert size={17} />} color="#d97706" />
            <StatCard label="Escalated" value={summary.escalated} foot={`${summary.escalatedToAdmin} to admin`} icon={<IcAlert size={17} />} color="#dc2626" />
          </div>

          {hasSelection ? (
            <section className="csr-card csr-card--accent">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span className="csr-logo" style={{ width: 40, height: 40, borderRadius: 8 }}><IcBuilding size={19} /></span>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
                      {selected?.clinic_name}
                    </h2>
                    <span className={`csr-pill ${clinicTone.tone === 'active' ? 'csr-pill--green' : clinicTone.tone === 'inactive' ? 'csr-pill--red' : 'csr-pill--grey'}`}>
                      {clinicTone.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 5, fontSize: 11.5, color: '#a9b8dd' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ color: '#38bdf8', display: 'flex' }}><IcPhone size={12} /></span>
                      {selected?.clinic_phone || '—'}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ color: '#4ade80', display: 'flex' }}><IcWhatsApp size={12} /></span>
                      {selected?.wa_account_no || '—'}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ color: '#c4b5fd', display: 'flex' }}><IcUser size={12} /></span>
                      {selected?.support_name || selected?.registered_contact || '—'}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ color: '#fbbf24', display: 'flex' }}><IcBuilding size={12} /></span>
                      {[selected?.city, selected?.state].filter(Boolean).join(', ') || '—'}
                    </span>
                  </div>
                </div>
                <a className="csr-btn csr-btn--ghost csr-btn--sm" href="/crm" target="_blank" rel="noopener noreferrer">
                  View Details <IcExternal size={12} />
                </a>
              </div>

              <div className="csr-tabs" style={{ marginTop: 14, marginBottom: 0 }}>
                <button type="button" className="csr-tab" data-active={tab === 'history'} onClick={() => setTab('history')}>Support History</button>
                <button type="button" className="csr-tab" data-active={tab === 'issues'} onClick={() => setTab('issues')}>Issue Summary</button>
                <button type="button" className="csr-tab" data-active={tab === 'performance'} onClick={() => setTab('performance')}>Performance</button>
              </div>
            </section>
          ) : (
            <section className="csr-card">
              <EmptyHint>
                <span style={{ display: 'flex', color: '#38bdf8' }}><IcSearch size={22} /></span>
                <b style={{ color: '#e7edff', fontSize: 13 }}>Search a clinic to build its support report</b>
                <span>Use the search bar above for clinic name, phone, WhatsApp or PIC.</span>
              </EmptyHint>
            </section>
          )}

          {/* Tab content */}
          {hasSelection && tab === 'history' && (
            <section className="csr-card">
              <SupportHistory
                records={filtered}
                relatedByRecord={relatedByRecord}
                onOpen={openRecord}
                loading={loadingRecords}
              />
            </section>
          )}

          {hasSelection && tab === 'issues' && (
            <section className="csr-card">
              <div className="csr-card-head">
                <h2 className="csr-card-title">Issue Summary</h2>
                <span className="csr-card-meta">{filtered.length} records in range</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
                <div>
                  <span className="csr-label" style={{ marginBottom: 8 }}>By Issue Category</span>
                  {categories.length === 0 ? <EmptyHint>No categorised records</EmptyHint> : (
                    <div className="csr-legend" style={{ gap: 10 }}>
                      {categories.map(c => (
                        <div key={c.name} style={{ display: 'grid', gap: 4 }}>
                          <div className="csr-legend-row">
                            <span className="csr-dot" style={{ background: c.color }} />
                            <span className="csr-legend-name">{c.name}</span>
                            <span className="csr-legend-val">{c.value}</span>
                            <span className="csr-legend-pct">{pctLabel(c.pct)}</span>
                          </div>
                          <div className="csr-bar-track">
                            <div className="csr-bar-fill" style={{ width: `${Math.max(2, c.pct)}%`, background: c.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <span className="csr-label" style={{ marginBottom: 8 }}>By Status</span>
                  <StatusDistribution data={statusRows} />
                </div>
              </div>
            </section>
          )}

          {hasSelection && tab === 'performance' && (
            <section className="csr-card">
              <div className="csr-card-head">
                <h2 className="csr-card-title">Performance</h2>
                <span className="csr-card-meta"><span style={{ color: '#4ade80' }}>{pctLabel(summary.resolutionRate)}</span> resolved</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                <div>
                  <span className="csr-label" style={{ marginBottom: 8 }}>Support by Staff</span>
                  <StaffBarChart data={staffRows} />
                </div>
                <div>
                  <span className="csr-label" style={{ marginBottom: 8 }}>Status Distribution</span>
                  <StatusDistribution data={statusRows} />
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right column */}
        <div className="csr-stack csr-col-right">
          <SectionCard
            title="Clinic Overview"
            icon={<span style={{ color: '#60a5fa', display: 'flex' }}><IcBuilding size={15} /></span>}
            meta={selected?.clinic_code || ''}
          >
            {hasSelection ? (
              <div style={{ display: 'grid', gap: 9 }}>
                {[
                  ['Clinic Name', selected?.clinic_name || '—'],
                  ['Phone', selected?.clinic_phone || '—'],
                  ['WhatsApp', selected?.wa_account_no || '—'],
                  ['PIC', selected?.support_name || selected?.registered_contact || '—'],
                  ['Location', [selected?.city, selected?.state].filter(Boolean).join(', ') || '—'],
                  ['Clinic Status', clinicTone.label],
                  ['Total Support Calls', String(summary.total)],
                  ['Resolution Rate', pctLabel(summary.resolutionRate)],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                    <span className="csr-muted" style={{ fontSize: 10.5 }}>{label}</span>
                    <span className="csr-value" style={{ textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
                <div className="csr-divider" style={{ margin: '4px 0' }} />
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                  <span className="csr-muted" style={{ fontSize: 10.5 }}>License Expiry</span>
                  <span className="csr-value" style={{ textAlign: 'right' }}>{selected?.mtn_expiry ? fmtDate(selected.mtn_expiry) : '—'}</span>
                </div>
              </div>
            ) : (
              <EmptyHint>Select a clinic</EmptyHint>
            )}
          </SectionCard>

          <SectionCard
            title="Support by Issue Category"
            icon={<span style={{ color: '#c4b5fd', display: 'flex' }}><IcChart size={15} /></span>}
            meta={`${filtered.length} records`}
          >
            <CategoryDonut data={categories} />
          </SectionCard>

          <SectionCard
            title="Support Trend"
            icon={<span style={{ color: '#22d3ee', display: 'flex' }}><IcSparkle size={15} /></span>}
            meta={trendView === 'compare' ? monthLabel(new Date()) : trendView}
          >
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
              {([
                ['compare', 'This vs Last'],
                ['day', 'Daily'],
                ['week', 'Weekly'],
                ['month', 'Monthly'],
              ] as [TrendView, string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className="csr-btn csr-btn--sm"
                  onClick={() => setTrendView(value)}
                  style={trendView === value
                    ? { background: 'linear-gradient(135deg,#4f46e5,#2563eb)', color: '#fff' }
                    : { background: 'rgba(148,163,184,0.1)', color: '#a9b8dd', borderColor: 'rgba(148,163,184,0.22)' }}
                >
                  {label}
                </button>
              ))}
            </div>
            {trendView === 'compare'
              ? <MonthCompareChart points={comparePoints} />
              : <PeriodTrendChart points={trendPoints} />}
            <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 10, color: '#6f81ab' }}>
              {trendView === 'compare' ? (
                <>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span className="csr-dot" style={{ background: '#38bdf8' }} />This month</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span className="csr-dot" style={{ background: '#a855f7' }} />Last month</span>
                </>
              ) : (
                <span>Records per {trendView} (filtered range)</span>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Quick Actions"
            icon={<span style={{ color: '#fbbf24', display: 'flex' }}><IcDownload size={15} /></span>}
          >
            <div style={{ display: 'grid', gap: 8 }}>
              <button type="button" className="csr-quick" disabled={!hasSelection} onClick={() => exportReportPdf(exportPayload)}>
                <span style={{ color: '#f87171', display: 'flex' }}><IcDocPdf size={16} /></span> Export PDF
              </button>
              <button type="button" className="csr-quick" disabled={!hasSelection} onClick={() => void exportReportExcel(exportPayload)}>
                <span style={{ color: '#4ade80', display: 'flex' }}><IcDocSheet size={16} /></span> Export Excel
              </button>
              <button type="button" className="csr-quick" disabled={!hasSelection} onClick={() => setMonthlyOpen(true)}>
                <span style={{ color: '#c4b5fd', display: 'flex' }}><IcSparkle size={16} /></span> Generate Monthly Report
              </button>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 10, color: '#6f81ab' }}>
              Exports always follow the filters above: {filterSummary}
            </p>
          </SectionCard>
        </div>
      </div>

      {monthlyOpen && (
        <MonthlyReportModal
          clinic={selected}
          records={records}
          generatedBy={generatedBy}
          onClose={() => setMonthlyOpen(false)}
        />
      )}
    </div>
  )
}
