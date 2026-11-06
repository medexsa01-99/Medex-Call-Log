'use client'

// WHY: Clinic lookup for the Report. Both the top search bar and the left
// "Clinics" panel filter the clinic list already loaded from CRM in memory —
// instant suggestions, no round trip per keystroke. Record counts come from
// the real tickets table (clinic_code + record_type only).

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReportClinic } from './report-utils'
import { IcBuilding, IcChevronLeft, IcChevronRight, IcClose, IcSearch } from './ReportUI'

export const clinicKey = (c: ReportClinic) => c.clinic_code || c.clinic_name

const digitsOnly = (value: string | null | undefined) => (value || '').replace(/\D/g, '')

function clinicMatches(c: ReportClinic, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    c.clinic_name, c.clinic_code, c.state, c.city, c.registered_contact, c.support_name, c.clinic_phone, c.wa_account_no,
  ]
  if (haystack.some(v => (v || '').toLowerCase().includes(q))) return true
  const digits = digitsOnly(q)
  if (digits.length >= 3) {
    return digitsOnly(c.clinic_phone).includes(digits) || digitsOnly(c.wa_account_no).includes(digits)
  }
  return false
}

// ── Top search bar with suggestions ──

export function ClinicSearchBar({
  clinics, counts, query, onQueryChange, onSelect, selected, loading,
}: {
  clinics: ReportClinic[]
  counts: Record<string, number>
  query: string
  onQueryChange: (value: string) => void
  onSelect: (clinic: ReportClinic) => void
  selected: ReportClinic | null
  loading: boolean
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => {
    const list = clinics.filter(c => clinicMatches(c, query))
    // Busiest clinics first — the ones the team actually calls about.
    list.sort((a, b) => (counts[clinicKey(b)] || 0) - (counts[clinicKey(a)] || 0) || a.clinic_name.localeCompare(b.clinic_name))
    return list.slice(0, 8)
  }, [clinics, counts, query])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => { setActiveIndex(0) }, [query])

  const commit = (clinic: ReportClinic) => {
    onSelect(clinic)
    setOpen(false)
  }

  return (
    <div ref={boxRef} className="csr-searchbar">
      <span style={{ color: '#6f81ab', display: 'flex' }}><IcSearch size={17} /></span>
      <input
        value={query}
        placeholder="Search clinic name, phone, WhatsApp or PIC…"
        aria-label="Search clinic"
        onFocus={() => setOpen(true)}
        onChange={e => { onQueryChange(e.target.value); setOpen(true) }}
        onKeyDown={e => {
          if (e.key === 'Escape') { setOpen(false); return }
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActiveIndex(i => Math.min(i + 1, suggestions.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
          if (e.key === 'Enter' && suggestions[activeIndex]) { e.preventDefault(); commit(suggestions[activeIndex]) }
        }}
      />
      {loading && <span style={{ fontSize: 10.5, color: '#6f81ab' }}>loading…</span>}
      {!!query && (
        <button
          type="button"
          className="csr-icon-btn"
          style={{ width: 24, height: 24 }}
          onClick={() => { onQueryChange(''); setOpen(false) }}
          title="Clear search"
        >
          <IcClose size={12} />
        </button>
      )}

      {open && (
        <div className="csr-suggest csr-scroll">
          {suggestions.length === 0 ? (
            <div className="csr-empty" style={{ padding: 16 }}>
              {clinics.length === 0 ? 'No clinics found in CRM' : `No clinic matches “${query}”`}
            </div>
          ) : (
            suggestions.map((c, i) => (
              <button
                key={c.id}
                type="button"
                className="csr-suggest-item"
                data-active={i === activeIndex || c.id === selected?.id}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => commit(c)}
              >
                <span style={{ color: '#60a5fa', display: 'flex' }}><IcBuilding size={15} /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.clinic_name}
                  </span>
                  <span style={{ display: 'block', fontSize: 10, color: '#6f81ab' }}>
                    {[c.clinic_code, c.state, c.clinic_phone].filter(Boolean).join(' · ') || 'No details'}
                  </span>
                </span>
                <span className="csr-clinic-count">{counts[clinicKey(c)] || 0}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Left column: ranked clinic list ──

const PER_PAGE = 10

export function ClinicPanel({
  clinics, counts, selectedId, onSelect,
}: {
  clinics: ReportClinic[]
  counts: Record<string, number>
  selectedId: string | null
  onSelect: (clinic: ReportClinic) => void
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const ranked = useMemo(() => {
    const list = clinics.filter(c => clinicMatches(c, search))
    list.sort((a, b) =>
      (counts[clinicKey(b)] || 0) - (counts[clinicKey(a)] || 0) || a.clinic_name.localeCompare(b.clinic_name)
    )
    return list
  }, [clinics, counts, search])

  useEffect(() => { setPage(1) }, [search])

  const totalPages = Math.max(1, Math.ceil(ranked.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const visible = ranked.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)
  const from = ranked.length === 0 ? 0 : (safePage - 1) * PER_PAGE + 1
  const to = Math.min(safePage * PER_PAGE, ranked.length)

  return (
    <section className="csr-card">
      <div className="csr-card-head">
        <h2 className="csr-card-title"><span style={{ color: '#60a5fa', display: 'flex' }}><IcBuilding size={16} /></span>Clinics</h2>
        <span className="csr-card-meta">Total Clinics: <b style={{ color: '#a9b8dd' }}>{clinics.length}</b></span>
      </div>

      <div className="csr-searchbar" style={{ height: 36, marginBottom: 10 }}>
        <span style={{ color: '#6f81ab', display: 'flex' }}><IcSearch size={14} /></span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clinic…"
          aria-label="Search clinic list"
          style={{ fontSize: 12 }}
        />
      </div>

      <div className="csr-clinic-scroll csr-scroll">
        {visible.length === 0 ? (
          <div className="csr-empty">No clinic matches this search</div>
        ) : (
          <div style={{ display: 'grid', gap: 3 }}>
            {visible.map(c => (
              <button
                key={c.id}
                type="button"
                className="csr-clinic-item"
                data-active={c.id === selectedId}
                onClick={() => onSelect(c)}
                title={`${c.clinic_name}${c.state ? ' · ' + c.state : ''}`}
              >
                <span style={{ display: 'flex', opacity: 0.9 }}><IcBuilding size={14} /></span>
                <span className="csr-clinic-name">{c.clinic_name}</span>
                <span className="csr-clinic-count">{counts[clinicKey(c)] || 0}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="csr-pager">
        <span style={{ whiteSpace: 'nowrap' }}>Showing {from}-{to} of {ranked.length} clinics</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            className="csr-pager-btn"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            aria-label="Previous page"
          >
            <IcChevronLeft size={11} />
          </button>
          <span style={{ color: '#c7d2fe', fontWeight: 600 }}>{safePage}</span>
          <span>/ {totalPages}</span>
          <button
            type="button"
            className="csr-pager-btn"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            aria-label="Next page"
          >
            <IcChevronRight size={11} />
          </button>
        </span>
      </div>
    </section>
  )
}
