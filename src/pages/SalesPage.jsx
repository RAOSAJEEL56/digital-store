import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../context/store.js'
import { formatCurrency, isInPeriod } from '../utils/format.js'
import { EmptyState, Panel, TextInput } from '../components/common/UI.jsx'

function billQuantity(sale) {
  return (sale.items || []).reduce((count, item) => count + Number(item.qty || 0), 0)
}

function displayDate(value) {
  return value ? new Date(value).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : '—'
}

export default function SalesPage() {
  const { sales, settings } = useStore()
  const [query, setQuery] = useState('')
  const [payment, setPayment] = useState('All')
  const [period, setPeriod] = useState('all')
  const [printRows, setPrintRows] = useState(null)

  const visibleSales = useMemo(() => sales
    .filter((sale) => {
      const searchText = `${sale.id} ${sale.customerName || ''} ${sale.customerPhone || ''}`.toLowerCase()
      return searchText.includes(query.trim().toLowerCase())
        && (payment === 'All' || (sale.paymentMethod || 'Cash') === payment)
        && isInPeriod(sale.timestamp, period)
    })
    .sort((first, second) => new Date(second.timestamp) - new Date(first.timestamp)),
  [payment, period, query, sales])
  const totalCash = visibleSales
    .filter((sale) => (sale.paymentMethod || 'Cash') === 'Cash')
    .reduce((sum, sale) => sum + Number(sale.grandTotal || 0), 0)

  useEffect(() => {
    if (!printRows) return undefined
    const clearPrintRows = () => setPrintRows(null)
    window.addEventListener('afterprint', clearPrintRows)
    window.print()
    return () => window.removeEventListener('afterprint', clearPrintRows)
  }, [printRows])

  return (
    <div className="mx-auto max-w-[1500px]">
      <Panel className="mb-3 flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-900">
            <i className="fa-solid fa-clipboard-list text-emerald-600" aria-hidden="true" />
            Sales History
          </h1>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">All bills with profit</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[10px] font-extrabold text-amber-900 sm:text-xs">
            Total Cash: {formatCurrency(totalCash)}
          </span>
          <button
            type="button"
            disabled={!visibleSales.length}
            onClick={() => setPrintRows(visibleSales)}
            title="Open print dialog to save the filtered sales report as PDF"
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-[10px] font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs"
          >
            <i className="fa-solid fa-file-pdf text-rose-600" aria-hidden="true" />
            Export PDF
            <i className="fa-solid fa-chevron-down text-[9px] text-slate-400" aria-hidden="true" />
          </button>
        </div>
      </Panel>

      <Panel className="mb-3 p-3">
        <div className="grid gap-2.5 md:grid-cols-3">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-xs text-slate-400" aria-hidden="true" />
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search bill or customer"
              aria-label="Search bill or customer"
              className="min-h-9 rounded-lg border-slate-300 bg-slate-50 pl-9 text-xs"
            />
          </div>
          <select
            value={payment}
            onChange={(event) => setPayment(event.target.value)}
            aria-label="Filter by payment"
            className="min-h-9 rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500"
          >
            <option value="All">All Payments</option>
            <option value="Cash">Cash</option>
            <option value="Digital">Digital</option>
            <option value="Bank">Bank</option>
            <option value="Udhar">Udhar</option>
          </select>
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label="Filter by date"
            className="min-h-9 rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7">Last 7 Days</option>
            <option value="last30">Last 30 Days</option>
          </select>
        </div>
      </Panel>

      <div className="mb-3 flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-[11px] text-sky-900">
        <i className="fa-solid fa-circle-info shrink-0 text-sky-700" aria-hidden="true" />
        <span><strong>Tip:</strong> Search a customer to download their PDF.</span>
      </div>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr className="text-[10px] font-extrabold uppercase tracking-wide text-slate-700">
                <th className="px-3 py-3">Invoice ID<span className="mt-0.5 block text-[9px] font-medium normal-case tracking-normal text-slate-400">Bill no.</span></th>
                <th className="px-3 py-3">Date &amp; time<span className="mt-0.5 block text-[9px] font-medium normal-case tracking-normal text-slate-400">When</span></th>
                <th className="px-3 py-3">Customer<span className="mt-0.5 block text-[9px] font-medium normal-case tracking-normal text-slate-400">Buyer</span></th>
                <th className="px-3 py-3 text-center">Items<span className="mt-0.5 block text-[9px] font-medium normal-case tracking-normal text-slate-400">Qty</span></th>
                <th className="px-3 py-3 text-right">Bill total<span className="mt-0.5 block text-[9px] font-medium normal-case tracking-normal text-slate-400">Amount</span></th>
                <th className="px-3 py-3 text-right">Cost (CP)<span className="mt-0.5 block text-[9px] font-medium normal-case tracking-normal text-slate-400">Buy price</span></th>
                <th className="px-3 py-3 text-right">Net profit<span className="mt-0.5 block text-[9px] font-medium normal-case tracking-normal text-slate-400">Earned</span></th>
                <th className="px-3 py-3 text-center">Payment<span className="mt-0.5 block text-[9px] font-medium normal-case tracking-normal text-slate-400">Paid by</span></th>
                <th className="px-3 py-3 text-center">Actions<span className="mt-0.5 block text-[9px] font-medium normal-case tracking-normal text-slate-400">Print</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleSales.map((sale) => (
                <tr key={sale.id} className="text-xs transition hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] font-extrabold text-slate-900">{sale.id}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">{displayDate(sale.timestamp)}</td>
                  <td className="px-3 py-3">
                    <span className="font-semibold text-slate-800">{sale.customerName || 'Walk-in Customer'}</span>
                    {sale.customerId && <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">{sale.customerId}</span>}
                    {sale.customerPhone && <span className="mt-0.5 block text-[10px] text-slate-400">{sale.customerPhone}</span>}
                  </td>
                  <td className="px-3 py-3 text-center font-bold text-slate-700">{billQuantity(sale)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-black text-slate-900">{formatCurrency(sale.grandTotal)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-slate-600">{formatCurrency(sale.totalCost)}</td>
                  <td className={`whitespace-nowrap px-3 py-3 text-right font-extrabold ${Number(sale.profit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {Number(sale.profit || 0) >= 0 ? '+' : '−'}{formatCurrency(Math.abs(Number(sale.profit || 0)))}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`rounded px-2 py-1 text-[9px] font-black uppercase ${sale.paymentMethod === 'Udhar' ? 'bg-rose-100 text-rose-700' : ['Digital', 'Bank'].includes(sale.paymentMethod) ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-800'}`}>
                      {sale.paymentMethod || 'Cash'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => setPrintRows([sale])}
                      aria-label={`Print invoice ${sale.id}`}
                      title="Print invoice"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-emerald-700"
                    >
                      <i className="fa-solid fa-print" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visibleSales.length && <EmptyState icon="fa-receipt" title="No sales found" description="Try changing your search or filters." />}
        </div>
      </Panel>

      {printRows && (
        <article className="print-sales-report" aria-hidden="true">
          <h1>{settings.storeName || 'Digital Store'} — Sales History</h1>
          <p>{printRows.length === 1 ? `Invoice ${printRows[0].id}` : `${printRows.length} bills`} · Printed {new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr><th>Invoice ID</th><th>Date &amp; Time</th><th>Customer</th><th>Items</th><th>Bill Total</th><th>Cost (CP)</th><th>Net Profit</th><th>Payment</th></tr>
            </thead>
            <tbody>
              {printRows.map((sale) => (
                <tr key={sale.id}>
                  <td>{sale.id}</td>
                  <td>{displayDate(sale.timestamp)}</td>
                  <td>{sale.customerName || 'Walk-in Customer'}</td>
                  <td>{billQuantity(sale)}</td>
                  <td>{formatCurrency(sale.grandTotal)}</td>
                  <td>{formatCurrency(sale.totalCost)}</td>
                  <td>{formatCurrency(sale.profit)}</td>
                  <td>{sale.paymentMethod || 'Cash'}{sale.onlineAccount ? ` · ${sale.onlineAccount}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="print-sales-total">
            Cash total: {formatCurrency(printRows.filter((sale) => (sale.paymentMethod || 'Cash') === 'Cash').reduce((sum, sale) => sum + Number(sale.grandTotal || 0), 0))}
          </p>
        </article>
      )}
    </div>
  )
}
