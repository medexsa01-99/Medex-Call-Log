'use client'

// WHY: "Generate Monthly Report" — a scoped, printable summary of one month of
// support activity for the selected clinic. Uses the records already loaded for
// that clinic (real data), and exports through the same helpers as the page.

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  buildSummary, categoryBuckets, staffBuckets, statusBuckets,
  pctLabel, type ReportClinic, type SupportRecord,
} from './report-utils'
import { exportReportExcel, exportReportPdf } from './report-export'
import { EmptyHint, IcClose, IcDocPdf, IcDocSheet, IcSparkle, StatCard } from './ReportUI'

export function MonthlyReportModal({
  clinic, records, generatedBy, onClose,
}: {
  clinic: ReportClinic | null
  records: SupportRecord[]
  generatedBy: string
  onClose: () => void
}) {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'))

  const monthRecords = useMemo(
    () => records.filter(r => (r.created_at || '').slice(0, 7) === month),
    [records, month]
  )

  const summary = useMemo(() => buildSummary(monthRecords), [monthRecords])
  const categories = useMemo(() => categoryBuckets(monthRecords), [monthRecords])
  const staff = useMemo(() => staffBuckets(monthRecords), [monthRecords])
  const statuses = useMemo(() => statusBuckets(monthRecords), [monthRecords])

  const monthText = (() => {
    const [y, m] = month.split('-').map(Number)
    return format(new Date(y, (m || 1) - 1, 1), 'MMMM yyyy')
  })()

  const payload = {
    clinic,
    filterSummary: `Month: ${monthText}`,
    records: monthRecords,
    summary,
    categories,
    staff,
    statuses,
    generatedBy,
    title: 'Monthly Clinic Support Report',
    subtitle: `${clinic?.clinic_name || 'Clinic'} · ${monthText}`,
  }

  return (
    <div className="csr-modal-backdrop" onClick={onClose}>
      <div className="csr-modal" onClick={e => e.stopPropagation()}>
        <div className="csr-card-head" style={{ marginBottom: 10 }}>
          <h2 className="csr-card-title"><span style={{ color: '#c4b5fd', display: 'flex' }}><IcSparkle size={16} /></span>Monthly Support Report</h2>
          <button type="button" className="csr-icon-btn" style={{ width: 26, height: 26 }} onClick={onClose} aria-label="Close">
            <IcClose size={13} />
          </button>
        </div>

        <p className="csr-muted" style={{ fontSize: 11, marginTop: 0, marginBottom: 12 }}>
          {clinic?.clinic_name || 'Select a clinic first'} — pick a month, then export.
        </p>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          <input
            type="month"
            className="csr-input"
            value={month}
            onChange={e => setMonth(e.target.value || format(new Date(), 'yyyy-MM'))}
            style={{ flex: '0 0 auto', height: 36 }}
            aria-label="Report month"
          />
          <span className="csr-pill csr-pill--violet">{monthRecords.length} records</span>
          <span className="csr-pill csr-pill--green">{pctLabel(summary.resolutionRate)} resolved</span>
        </div>

        {monthRecords.length === 0 ? (
          <EmptyHint>
            No support records for {monthText}.
            <br />
            Choose another month — nothing is invented here.
          </EmptyHint>
        ) : (
          <>
            <div className="csr-stats" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', marginBottom: 14 }}>
              <StatCard label="Total" value={summary.total} icon={<span>Σ</span>} color="#3b82f6" />
              <StatCard label="Resolved" value={summary.resolved} icon={<span>✓</span>} color="#22c55e" />
              <StatCard label="In Progress" value={summary.inProgress} icon={<span>◔</span>} color="#38bdf8" />
              <StatCard label="Pending" value={summary.pendingCustomer + summary.pendingTeam} icon={<span>!</span>} color="#f59e0b" />
            </div>

            <div className="csr-divider" />

            <div style={{ display: 'grid', gap: 8 }}>
              <span className="csr-label">Top Issue Categories</span>
              {categories.slice(0, 4).map(c => (
                <div key={c.name} className="csr-legend-row">
                  <span className="csr-dot" style={{ background: c.color }} />
                  <span className="csr-legend-name">{c.name}</span>
                  <span className="csr-legend-val">{c.value}</span>
                  <span className="csr-legend-pct">{pctLabel(c.pct)}</span>
                </div>
              ))}
            </div>

            <div className="csr-divider" />

            <div style={{ display: 'grid', gap: 8 }}>
              <span className="csr-label">Handled By</span>
              {staff.slice(0, 5).map(s => (
                <div key={s.name} className="csr-legend-row">
                  <span className="csr-dot" style={{ background: s.color }} />
                  <span className="csr-legend-name">{s.name}</span>
                  <span className="csr-legend-val">{s.value}</span>
                  <span className="csr-legend-pct">{pctLabel(s.pct)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="csr-btn csr-btn--primary"
            style={{ flex: '1 1 140px' }}
            disabled={monthRecords.length === 0}
            onClick={() => exportReportPdf(payload)}
          >
            <IcDocPdf size={14} /> Export PDF
          </button>
          <button
            type="button"
            className="csr-btn csr-btn--reset"
            style={{ flex: '1 1 140px' }}
            disabled={monthRecords.length === 0}
            onClick={() => void exportReportExcel(payload)}
          >
            <IcDocSheet size={14} /> Export Excel
          </button>
        </div>
      </div>
    </div>
  )
}
