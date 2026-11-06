'use client'

// WHY: Complete support history for the selected clinic. Rows are the real
// `tickets` records (call logs + tickets) — clicking one opens the original
// record in the existing Call Log / History detail page (/tickets/[id]).
// The chevron expands the extra fields in place (timelines, Jira, related work)
// so the table stays readable.

import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  categoryOf, fmtDateTime, fmtMinutes, staffOf,
  type SupportRecord,
} from './report-utils'
import {
  EmptyHint, IcChevronDown, IcChevronRight, IcExternal, IcFilter, IcSearch, StatusPill,
} from './ReportUI'

const PER_PAGE = 10

function matchesSearch(r: SupportRecord, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  return [
    r.ticket_ref, r.pic, r.caller_tel, r.issue, r.my_response, r.created_by_name,
    r.status, r.issue_type, r.issue_category, r.next_step, r.internal_timeline,
    r.timeline_from_customer, r.jira_link,
  ].some(v => (v || '').toLowerCase().includes(needle))
}

export function SupportHistory({
  records, relatedByRecord, onOpen, loading,
}: {
  records: SupportRecord[]
  relatedByRecord: Record<string, SupportRecord[]>
  onOpen: (record: SupportRecord) => void
  loading?: boolean
}) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'call' | 'ticket'>('all')
  const [showFilter, setShowFilter] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return records.filter(r =>
      (typeFilter === 'all' || r.record_type === typeFilter) && matchesSearch(r, search.trim())
    )
  }, [records, search, typeFilter])

  useEffect(() => { setPage(1) }, [search, typeFilter, records.length])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const visible = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ fontSize: 12.5, fontWeight: 650, color: '#fff' }}>
          Support Activities <span className="csr-muted">({filtered.length} {filtered.length === 1 ? 'record' : 'records'})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="csr-searchbar" style={{ height: 34, minWidth: 210, flex: '0 1 260px' }}>
            <span style={{ color: '#6f81ab', display: 'flex' }}><IcSearch size={13} /></span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search in this clinic…"
              aria-label="Search support history"
              style={{ fontSize: 11.5 }}
            />
          </div>
          <button
            type="button"
            className="csr-icon-btn"
            onClick={() => setShowFilter(v => !v)}
            title="Filter by record type"
            aria-pressed={showFilter}
            style={showFilter ? { color: '#fff', background: 'rgba(99,102,241,0.35)' } : undefined}
          >
            <IcFilter size={14} />
          </button>
        </div>
      </div>

      {showFilter && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {([
            ['all', 'All records'],
            ['call', 'Call Logs'],
            ['ticket', 'Tickets'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="csr-btn csr-btn--sm"
              onClick={() => setTypeFilter(value)}
              style={typeFilter === value
                ? { background: 'linear-gradient(135deg,#4f46e5,#2563eb)', color: '#fff' }
                : { background: 'rgba(148,163,184,0.1)', color: '#a9b8dd', borderColor: 'rgba(148,163,184,0.22)' }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="csr-table-wrap csr-scroll">
        <table className="csr-table">
          <thead>
            <tr>
              <th style={{ width: 26 }} />
              <th>Date &amp; Time</th>
              <th>Caller / PIC</th>
              <th>Issue / Request</th>
              <th>Action Taken</th>
              <th>Staff</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Next Step</th>
              <th style={{ width: 74 }}>Related</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`} style={{ cursor: 'default' }}>
                  <td colSpan={10} style={{ padding: '10px 12px' }}>
                    <div className="csr-bar-track" style={{ height: 10, opacity: 0.35 }} />
                  </td>
                </tr>
              ))
            ) : visible.length === 0 ? (
              <tr style={{ cursor: 'default' }}>
                <td colSpan={10}>
                  <EmptyHint>
                    No support records match this selection.
                    <br />
                    Try widening the date range or clearing the filters.
                  </EmptyHint>
                </td>
              </tr>
            ) : visible.map(r => {
              const expanded = expandedId === r.id
              const related = relatedByRecord[r.id] || []
              return (
                <Fragment key={r.id}>
                  <tr
                    data-expanded={expanded}
                    onClick={() => onOpen(r)}
                    title="Open the original record"
                  >
                    <td style={{ paddingRight: 0 }}>
                      <button
                        type="button"
                        className="csr-icon-btn"
                        style={{ width: 22, height: 22, border: 0, background: 'transparent' }}
                        onClick={e => { e.stopPropagation(); setExpandedId(expanded ? null : r.id) }}
                        aria-label={expanded ? 'Hide details' : 'Show details'}
                      >
                        {expanded ? <IcChevronDown size={13} /> : <IcChevronRight size={13} />}
                      </button>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div className="csr-cell-strong">{fmtDateTime(r.created_at)}</div>
                      <div className="csr-muted" style={{ fontSize: 10 }}>
                        {r.ticket_ref || '—'} · {r.record_type === 'ticket' ? 'Ticket' : 'Call'}
                      </div>
                    </td>
                    <td>
                      <div className="csr-cell-strong">{r.pic || '—'}</div>
                      {r.caller_tel && <div className="csr-muted" style={{ fontSize: 10 }}>{r.caller_tel}</div>}
                    </td>
                    <td>
                      <div className="csr-clamp-2" title={r.issue || ''}>{r.issue || '—'}</div>
                      <div className="csr-muted" style={{ fontSize: 10, marginTop: 2 }}>{categoryOf(r)}</div>
                    </td>
                    <td><div className="csr-clamp-2" title={r.my_response || ''}>{r.my_response || '—'}</div></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{staffOf(r)}</td>
                    <td><StatusPill status={r.status} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtMinutes(r.call_duration)}</td>
                    <td><div className="csr-clamp-2" title={r.next_step || ''}>{r.next_step || '—'}</div></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {related.length > 0
                        ? <span className="csr-pill csr-pill--cyan">{related.length} linked</span>
                        : <span className="csr-muted">—</span>}
                    </td>
                  </tr>

                  {expanded && (
                    <tr key={`${r.id}-detail`} style={{ cursor: 'default' }}>
                      <td colSpan={10} style={{ background: 'rgba(8,13,26,0.6)' }}>
                        <div className="csr-detail">
                          <div>
                            <span className="csr-label">Internal Timeline</span>
                            <div className="csr-value" style={{ fontWeight: 500 }}>{r.internal_timeline || '—'}</div>
                          </div>
                          <div>
                            <span className="csr-label">Customer Timeline</span>
                            <div className="csr-value" style={{ fontWeight: 500 }}>{r.timeline_from_customer || '—'}</div>
                          </div>
                          <div>
                            <span className="csr-label">Plan / Next Step</span>
                            <div className="csr-value" style={{ fontWeight: 500 }}>
                              {r.next_step || '—'}
                              {r.next_step_pic && <span className="csr-muted"> · PIC: {r.next_step_pic}</span>}
                            </div>
                          </div>
                          <div>
                            <span className="csr-label">Jira Link</span>
                            {r.jira_link ? (
                              <a
                                href={r.jira_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#22d3ee', fontSize: 12, wordBreak: 'break-all' }}
                                onClick={e => e.stopPropagation()}
                              >
                                {r.jira_link}
                              </a>
                            ) : (
                              <div className="csr-value" style={{ fontWeight: 500 }}>—</div>
                            )}
                          </div>
                          <div>
                            <span className="csr-label">Related Work ({related.length})</span>
                            {related.length === 0 ? (
                              <div className="csr-value" style={{ fontWeight: 500 }}>No related records in ±30 days</div>
                            ) : (
                              <div style={{ display: 'grid', gap: 3, marginTop: 3 }}>
                                {related.slice(0, 4).map(o => (
                                  <button
                                    key={o.id}
                                    type="button"
                                    onClick={e => { e.stopPropagation(); onOpen(o) }}
                                    style={{
                                      background: 'transparent', border: 0, padding: 0, textAlign: 'left',
                                      color: '#a9b8dd', fontSize: 11, cursor: 'pointer',
                                    }}
                                  >
                                    {fmtDateTime(o.created_at)} · {o.issue_type || categoryOf(o)} · {staffOf(o)}
                                  </button>
                                ))}
                                {related.length > 4 && <span className="csr-muted" style={{ fontSize: 10 }}>+{related.length - 4} more</span>}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button
                              type="button"
                              className="csr-btn csr-btn--sm csr-btn--primary"
                              onClick={e => { e.stopPropagation(); onOpen(r) }}
                            >
                              <IcExternal size={12} /> Open record
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="csr-pager">
        <span>Page {safePage} of {totalPages}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button type="button" className="csr-pager-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}>Prev</button>
          <button type="button" className="csr-pager-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>Next</button>
        </span>
      </div>
    </div>
  )
}
