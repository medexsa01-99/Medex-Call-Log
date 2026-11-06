// WHY: Export helpers for the Clinic Support Report.
// Excel uses the already-installed `xlsx` package (dynamic import so it never
// lands in the main bundle). PDF reuses the app's existing pattern: build a
// standalone light-theme HTML document in a new window and let the browser's
// native "Save as PDF" handle printing — no heavy PDF dependency, no changes
// to the global print stylesheet.

import type { Bucket, ReportClinic, ReportSummary, SupportRecord } from './report-utils'
import { categoryOf, fmtDateTime, fmtMinutes, pctLabel, staffOf } from './report-utils'

export interface ReportExportPayload {
  clinic: ReportClinic | null
  filterSummary: string
  records: SupportRecord[]
  summary: ReportSummary
  categories: Bucket[]
  staff: Bucket[]
  statuses: Bucket[]
  generatedBy: string
  /** Optional heading override — monthly reports set their own title. */
  title?: string
  subtitle?: string
}

const stamp = () => new Date().toISOString().slice(0, 10)

const fileSafe = (value: string) =>
  value.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 60)

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const clinicName = (p: ReportExportPayload) => p.clinic?.clinic_name || 'All Clinics'

// ── Excel ──

export async function exportReportExcel(p: ReportExportPayload): Promise<void> {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const name = clinicName(p)

  const summaryRows: (string | number)[][] = [
    [p.title || 'Clinic Support Report'],
    [`Clinic: ${name}`],
    [`Clinic Code: ${p.clinic?.clinic_code || '-'}`],
    [`Phone: ${p.clinic?.clinic_phone || '-'}`, `WhatsApp: ${p.clinic?.wa_account_no || '-'}`],
    [`PIC: ${p.clinic?.support_name || p.clinic?.registered_contact || '-'}`, `State: ${p.clinic?.state || '-'}`],
    [`Generated: ${new Date().toLocaleString()}`, `By: ${p.generatedBy}`],
    [`Filters: ${p.filterSummary}`],
    [],
    ['Metric', 'Value'],
    ['Total Support Calls', p.summary.total],
    ['Resolved', p.summary.resolved],
    ['In Progress', p.summary.inProgress],
    ['Pending Customer', p.summary.pendingCustomer],
    ['Pending Team', p.summary.pendingTeam],
    ['Escalated', p.summary.escalated],
    ['Escalated to Admin', p.summary.escalatedToAdmin],
    ['Resolution Rate', pctLabel(p.summary.resolutionRate)],
  ]
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows)
  summaryWs['!cols'] = [{ wch: 34 }, { wch: 44 }]
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  const historyHeader = [
    'Date & Time', 'Ref', 'Type', 'Caller / PIC', 'Issue / Request', 'Action Taken',
    'Staff', 'Status', 'Duration', 'Next Step', 'Category', 'Internal Timeline',
    'Customer Timeline', 'Jira Link',
  ]
  const historyRows = p.records.map(r => [
    fmtDateTime(r.created_at),
    r.ticket_ref || '',
    r.record_type === 'ticket' ? 'Ticket' : 'Call Log',
    r.pic || r.caller_tel || '',
    r.issue || '',
    r.my_response || '',
    staffOf(r),
    r.status || '',
    fmtMinutes(r.call_duration),
    r.next_step || '',
    categoryOf(r),
    r.internal_timeline || '',
    r.timeline_from_customer || '',
    r.jira_link || '',
  ])
  const historyWs = XLSX.utils.aoa_to_sheet([historyHeader, ...historyRows])
  historyWs['!cols'] = [
    { wch: 17 }, { wch: 14 }, { wch: 10 }, { wch: 20 }, { wch: 46 }, { wch: 42 },
    { wch: 16 }, { wch: 18 }, { wch: 9 }, { wch: 30 }, { wch: 20 }, { wch: 34 },
    { wch: 34 }, { wch: 30 },
  ]
  XLSX.utils.book_append_sheet(wb, historyWs, 'Support History')

  const sheet = (title: string, label: string, rows: Bucket[]) => {
    const ws = XLSX.utils.aoa_to_sheet([
      [label, 'Records', '%'],
      ...rows.map(b => [b.name, b.value, pctLabel(b.pct)]),
    ])
    ws['!cols'] = [{ wch: 32 }, { wch: 12 }, { wch: 9 }]
    XLSX.utils.book_append_sheet(wb, ws, title)
  }
  sheet('By Category', 'Issue Category', p.categories)
  sheet('By Staff', 'Staff', p.staff)
  sheet('By Status', 'Status', p.statuses)

  XLSX.writeFile(wb, `${fileSafe(p.title || 'clinic-support-report')}-${fileSafe(name)}-${stamp()}.xlsx`)
}

// ── PDF (native print from a standalone document) ──

export function exportReportPdf(p: ReportExportPayload): void {
  const win = window.open('', '_blank', 'width=1100,height=800')
  if (!win) {
    // Popup blocked — fall back to an Excel download so the click never dies.
    void exportReportExcel(p)
    return
  }

  const name = clinicName(p)
  const title = p.title || 'Clinic Support Report'
  const subtitle = p.subtitle || name

  const bucketTable = (label: string, rows: Bucket[]) => `
    <table>
      <thead><tr><th>${escapeHtml(label)}</th><th style="width:90px">Records</th><th style="width:70px">%</th></tr></thead>
      <tbody>
        ${rows.length === 0
          ? '<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:14px">No records</td></tr>'
          : rows.map(b => `<tr><td>${escapeHtml(b.name)}</td><td>${b.value}</td><td>${pctLabel(b.pct)}</td></tr>`).join('')}
      </tbody>
    </table>`

  const historyBody = p.records.length === 0
    ? '<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:18px">No support records for this selection</td></tr>'
    : p.records.map(r => `
        <tr>
          <td>${escapeHtml(fmtDateTime(r.created_at))}</td>
          <td>${escapeHtml(r.pic || r.caller_tel || '-')}</td>
          <td>${escapeHtml(r.issue || '-')}</td>
          <td>${escapeHtml(r.my_response || '-')}</td>
          <td>${escapeHtml(staffOf(r))}</td>
          <td>${escapeHtml(r.status || '-')}</td>
          <td>${escapeHtml(fmtMinutes(r.call_duration))}</td>
          <td>${escapeHtml(r.next_step || '-')}</td>
        </tr>`).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)} — ${escapeHtml(name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 28px; color: #0f172a; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 13px; margin: 22px 0 8px; color: #1e293b; text-transform: uppercase; letter-spacing: .06em; }
  .sub { color: #64748b; font-size: 12px; margin-bottom: 14px; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px 20px; font-size: 11px; color: #475569; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #eef2ff; text-align: left; padding: 6px 7px; border: 1px solid #cbd5e1; font-size: 9px; text-transform: uppercase; letter-spacing: .04em; color: #3730a3; }
  td { padding: 6px 7px; border: 1px solid #e2e8f0; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  .kpis { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 4px; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; min-width: 96px; }
  .kpi .l { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: .05em; }
  .kpi .v { font-size: 16px; font-weight: 700; color: #0f172a; }
  .footer { margin-top: 18px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  .action-bar { position: sticky; top: 0; display: flex; gap: 8px; justify-content: flex-end; padding-bottom: 10px; background: #fff; }
  .action-bar button { font: inherit; font-size: 12px; font-weight: 600; color: #fff; background: #4f46e5; border: 0; border-radius: 8px; padding: 8px 14px; cursor: pointer; }
  .action-bar button.alt { background: #64748b; }
  @page { size: A4; margin: 12mm; }
  @media print { .action-bar { display: none; } thead { display: table-header-group; } tr { page-break-inside: avoid; } }
</style>
</head>
<body>
  <div class="action-bar">
    <button onclick="window.print()">Print / Save PDF</button>
    <button class="alt" onclick="window.close()">Close</button>
  </div>
  <h1>${escapeHtml(title)}</h1>
  <div class="sub">${escapeHtml(subtitle)}</div>
  <div class="meta">
    <span><b>Clinic:</b> ${escapeHtml(name)} (${escapeHtml(p.clinic?.clinic_code || '-')})</span>
    <span><b>Phone:</b> ${escapeHtml(p.clinic?.clinic_phone || '-')}</span>
    <span><b>WhatsApp:</b> ${escapeHtml(p.clinic?.wa_account_no || '-')}</span>
    <span><b>PIC:</b> ${escapeHtml(p.clinic?.support_name || p.clinic?.registered_contact || '-')}</span>
    <span><b>Location:</b> ${escapeHtml([p.clinic?.city, p.clinic?.state].filter(Boolean).join(', ') || '-')}</span>
    <span><b>Filters:</b> ${escapeHtml(p.filterSummary)}</span>
    <span><b>Generated:</b> ${escapeHtml(new Date().toLocaleString())} by ${escapeHtml(p.generatedBy)}</span>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="l">Total</div><div class="v">${p.summary.total}</div></div>
    <div class="kpi"><div class="l">Resolved</div><div class="v">${p.summary.resolved}</div></div>
    <div class="kpi"><div class="l">In Progress</div><div class="v">${p.summary.inProgress}</div></div>
    <div class="kpi"><div class="l">Pending Cust.</div><div class="v">${p.summary.pendingCustomer}</div></div>
    <div class="kpi"><div class="l">Pending Team</div><div class="v">${p.summary.pendingTeam}</div></div>
    <div class="kpi"><div class="l">Escalated</div><div class="v">${p.summary.escalated}</div></div>
    <div class="kpi"><div class="l">Resolution</div><div class="v">${pctLabel(p.summary.resolutionRate)}</div></div>
  </div>

  <h2>Support History (${p.records.length} records)</h2>
  <table>
    <thead>
      <tr>
        <th>Date &amp; Time</th><th>Caller / PIC</th><th>Issue / Request</th><th>Action Taken</th>
        <th>Staff</th><th>Status</th><th>Duration</th><th>Next Step</th>
      </tr>
    </thead>
    <tbody>${historyBody}</tbody>
  </table>

  <h2>Support by Issue Category</h2>
  ${bucketTable('Category', p.categories)}

  <h2>Support by Staff</h2>
  ${bucketTable('Staff', p.staff)}

  <h2>Status Distribution</h2>
  ${bucketTable('Status', p.statuses)}

  <div class="footer">Medex Workspace — Clinic Support Report · ${escapeHtml(stamp())}</div>
</body>
</html>`

  win.document.open()
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.print(), 300)
}
