import { useMemo, useState } from 'react'
import { useStore } from '../context/store.js'
import { formatCurrency, formatDate, isInPeriod } from '../utils/format.js'
import { EmptyState, PageHeading, Panel, PanelTitle, StatCard } from '../components/common/UI.jsx'

export default function ProfitPage() {
  const { sales } = useStore()
  const [period, setPeriod] = useState('today')
  const records = useMemo(() => sales.filter((sale) => isInPeriod(sale.timestamp, period)), [period, sales])
  const totals = records.reduce((sum, sale) => ({
    revenue: sum.revenue + Number(sale.grandTotal || 0),
    cost: sum.cost + Number(sale.totalCost || 0),
    profit: sum.profit + Number(sale.profit || 0),
  }), { revenue: 0, cost: 0, profit: 0})

  return (
    <div>
      <PageHeading eyebrow="Financial performance" title="Profit report" description="Sales, cost of goods and profit by invoice." action={<select value={period} onChange={(event) => setPeriod(event.target.value)} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none"><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="last7">7 days</option><option value="last30">30 days</option><option value="all">All time</option></select>} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Sales" value={formatCurrency(totals.revenue)} icon="fa-money-bill-wave" />
        <StatCard label="Cost of goods" value={formatCurrency(totals.cost)} icon="fa-truck-ramp-box" tone="blue" />
        <StatCard label="Net profit" value={formatCurrency(totals.profit)} icon="fa-sack-dollar" tone="emerald" detail={`${totals.revenue ? ((totals.profit / totals.revenue) * 100).toFixed(1) : '0'}% margin`} />
      </div>
      <Panel className="mt-5 overflow-hidden">
        <PanelTitle title="Profit by bill" subtitle={`${records.length} bills in selected period`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Invoice</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3 text-right">Bill total</th><th className="px-4 py-3 text-right">Cost</th><th className="px-5 py-3 text-right">Profit</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((sale) => <tr key={sale.id} className="hover:bg-slate-50"><td className="px-5 py-3 font-mono text-xs font-bold text-emerald-800">{sale.id}</td><td className="px-4 py-3 text-xs text-slate-500">{formatDate(sale.timestamp)}</td><td className="px-4 py-3 font-semibold">{sale.customerName || 'Walk-in Customer'}</td><td className="px-4 py-3 text-right font-bold">{formatCurrency(sale.grandTotal)}</td><td className="px-4 py-3 text-right text-slate-500">{formatCurrency(sale.totalCost)}</td><td className="px-5 py-3 text-right font-black text-emerald-700">{formatCurrency(sale.profit)}</td></tr>)}
            </tbody>
          </table>
          {!records.length && <EmptyState icon="fa-chart-line" title="No profit data for this period" description="Complete sales to generate profit reports." />}
        </div>
      </Panel>
    </div>
  )
}
