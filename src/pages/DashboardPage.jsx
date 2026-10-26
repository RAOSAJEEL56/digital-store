import { useMemo, useState } from 'react'
import { useStore } from '../context/store.js'
import { formatCurrency, isInPeriod } from '../utils/format.js'
import { EmptyState, PageHeading, Panel, PanelTitle, StatCard } from '../components/common/UI.jsx'

const periods = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['last7', '7 days'],
  ['last30', '30 days'],
  ['all', 'All time'],
]

export default function DashboardPage() {
  const { sales, products, customerBalances } = useStore()
  const [period, setPeriod] = useState('today')
  const filteredSales = useMemo(() => sales.filter((sale) => isInPeriod(sale.timestamp, period)), [period, sales])
  const totals = filteredSales.reduce((result, sale) => ({
    revenue: result.revenue + Number(sale.grandTotal || 0),
    cost: result.cost + Number(sale.totalCost || 0),
    profit: result.profit + Number(sale.profit || 0),
    items: result.items + (sale.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0),
  }), { revenue: 0, cost: 0, profit: 0, items: 0 })
  const lowStock = products.filter((product) => product.stock <= 10)
  const popularItems = useMemo(() => {
    const totalsByName = new Map()
    filteredSales.forEach((sale) => (sale.items || []).forEach((item) => {
      const current = totalsByName.get(item.name) || { name: item.name, qty: 0, profit: 0 }
      current.qty += Number(item.qty || 0)
      current.profit += Number(item.profit ?? ((item.price - item.cost) * item.qty))
      totalsByName.set(item.name, current)
    }))
    return [...totalsByName.values()].sort((a, b) => b.qty - a.qty).slice(0, 5)
  }, [filteredSales])

  return (
    <div>
      <PageHeading eyebrow="Store overview" title="Analytics" description="A quick look at sales, profit and stock health." action={
        <select value={period} onChange={(event) => setPeriod(event.target.value)} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500">
          {periods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      } />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatCurrency(totals.revenue)} icon="fa-money-bill-wave" detail={`${filteredSales.length} bills`} />
        <StatCard label="Net profit" value={formatCurrency(totals.profit)} icon="fa-sack-dollar" tone="blue" detail={`${totals.revenue ? ((totals.profit / totals.revenue) * 100).toFixed(1) : '0'}% margin`} />
        <StatCard label="Items sold" value={totals.items.toLocaleString()} icon="fa-basket-shopping" tone="amber" detail={`${formatCurrency(totals.cost)} cost of goods`} />
        <StatCard label="Udhar pending" value={formatCurrency(customerBalances.reduce((sum, customer) => sum + customer.balance, 0))} icon="fa-book-open" tone="rose" detail={`${customerBalances.length} customers`} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel className="overflow-hidden">
          <PanelTitle title="Recent sales" subtitle="Latest completed bills" />
          {filteredSales.length ? (
            <div className="divide-y divide-slate-100">
              {filteredSales.slice(0, 6).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><i className="fa-solid fa-receipt" aria-hidden="true" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{sale.customerName || 'Walk-in Customer'}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{sale.id} · {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800">{formatCurrency(sale.grandTotal)}</p>
                    <p className="text-[10px] font-bold text-emerald-700">{sale.paymentMethod}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No sales for this period" description="Completed bills will show up here." />}
        </Panel>

        <Panel className="overflow-hidden">
          <PanelTitle title="Stock attention" subtitle="Products with 10 or fewer units" action={<span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">{lowStock.length}</span>} />
          {lowStock.length ? (
            <div className="divide-y divide-slate-100">
              {lowStock.slice(0, 6).map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{product.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{product.category}</p>
                  </div>
                  <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-extrabold ${product.stock === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>{product.stock} {product.unit}</span>
                </div>
              ))}
            </div>
          ) : <EmptyState icon="fa-circle-check" title="Stock looks healthy" description="No products need a restock right now." />}
        </Panel>
      </div>

      <Panel className="mt-5 overflow-hidden">
        <PanelTitle title="Popular products" subtitle="Items sold most during this period" />
        {popularItems.length ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-5">
            {popularItems.map((item, index) => (
              <div key={item.name} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Top #{index + 1}</p>
                <p className="mt-2 line-clamp-2 min-h-10 text-sm font-extrabold text-slate-800">{item.name}</p>
                <p className="mt-2 text-xs text-slate-500">{item.qty} units sold</p>
                <p className="mt-1 text-xs font-bold text-emerald-800">{formatCurrency(item.profit)} profit</p>
              </div>
            ))}
          </div>
        ) : <EmptyState icon="fa-chart-column" title="Nothing to chart yet" description="Product performance appears after your first sale." />}
      </Panel>
    </div>
  )
}
