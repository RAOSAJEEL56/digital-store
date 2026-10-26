import { useMemo, useState } from 'react'
import { useStore } from '../context/store.js'
import { formatCurrency, formatDate, isInPeriod } from '../utils/format.js'
import { EmptyState, PageHeading, Panel, PanelTitle, StatCard } from '../components/common/UI.jsx'

export default function OnlinePaymentsPage() {
  const { sales, payments } = useStore()
  const [period, setPeriod] = useState('today')
  const records = useMemo(() => [
    ...sales.filter((sale) => ['Digital', 'Bank'].includes(sale.paymentMethod)).map((sale) => ({
      id: sale.id,
      timestamp: sale.timestamp,
      customer: sale.customerName || 'Walk-in Customer',
      source: 'Sale',
      account: sale.onlineAccount || 'Online',
      amount: Number(sale.grandTotal || 0),
    })),
    ...payments.filter((payment) => ['Digital', 'Bank'].includes(payment.paymentMethod)).map((payment) => ({
      id: payment.id,
      timestamp: payment.timestamp,
      customer: payment.customerName || payment.customerKey || 'Customer',
      source: 'Khata payment',
      account: payment.onlineAccount || 'Online',
      amount: Number(payment.amount || 0),
    })),
  ].filter((record) => isInPeriod(record.timestamp, period)).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)), [payments, period, sales])
  const total = records.reduce((sum, record) => sum + record.amount, 0)
  const accountTotals = records.reduce((accounts, record) => {
    accounts.set(record.account, (accounts.get(record.account) || 0) + record.amount)
    return accounts
  }, new Map())

  return (
    <div>
      <PageHeading eyebrow="Digital ledger" title="Online payments" description="Review JazzCash, EasyPaisa and bank payments received." action={<select value={period} onChange={(event) => setPeriod(event.target.value)} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none"><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="last7">7 days</option><option value="last30">30 days</option><option value="all">All time</option></select>} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Online received" value={formatCurrency(total)} icon="fa-mobile-screen-button" />
        <StatCard label="Transactions" value={records.length} icon="fa-arrow-right-arrow-left" tone="blue" />
        <div className="col-span-2 lg:col-span-1"><StatCard label="Accounts used" value={accountTotals.size} icon="fa-wallet" tone="amber" /></div>
      </div>
      {!!accountTotals.size && <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[...accountTotals].map(([account, amount]) => <div key={account} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">{account}</p><p className="mt-2 text-xl font-black text-emerald-900">{formatCurrency(amount)}</p></div>)}</div>}
      <Panel className="overflow-hidden">
        <PanelTitle title="Payment records" subtitle="Digital wallet and bank sales/repayments in the selected period" />
        {records.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Date</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Account</th><th className="px-5 py-3 text-right">Amount</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{records.map((record) => <tr key={record.id} className="hover:bg-slate-50"><td className="px-5 py-3 text-xs text-slate-500">{formatDate(record.timestamp)}</td><td className="px-4 py-3 font-bold text-slate-800">{record.customer}</td><td className="px-4 py-3"><span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{record.source}</span></td><td className="px-4 py-3 text-xs font-semibold text-slate-600">{record.account}</td><td className="px-5 py-3 text-right font-black text-emerald-700">{formatCurrency(record.amount)}</td></tr>)}</tbody>
        </table></div> : <EmptyState icon="fa-mobile-screen-button" title="No online payments found" description="Digital payments will appear here after checkout or a khata payment." />}
      </Panel>
    </div>
  )
}
