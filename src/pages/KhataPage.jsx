import { useMemo, useState } from 'react'
import { useStore } from '../context/store.js'
import { formatCurrency, formatDate } from '../utils/format.js'
import { Button, EmptyState, PageHeading, Panel, PanelTitle, StatCard, TextInput } from '../components/common/UI.jsx'

export default function KhataPage() {
  const { customerBalances, addPayment, payments, settings } = useStore()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Cash')
  const [account, setAccount] = useState('JazzCash')
  const [error, setError] = useState('')
  const customers = useMemo(() => customerBalances.filter((customer) => `${customer.name} ${customer.phone}`.toLowerCase().includes(query.toLowerCase())), [customerBalances, query])
  const outstanding = customerBalances.reduce((total, customer) => total + customer.balance, 0)

  const submitPayment = (event) => {
    event.preventDefault()
    const value = Number(amount)
    if (!selected || !Number.isFinite(value) || value <= 0 || value > selected.balance) {
      setError('Payment amount valid honi chahiye aur pending balance se zyada nahi ho sakti.')
      return
    }
    addPayment({ customerKey: selected.key, customerName: selected.name, amount: value, paymentMethod: method, onlineAccount: method === 'Digital' ? account : '' })
    setSelected(null)
    setAmount('')
    setError('')
    setMethod('Cash')
  }

  return (
    <div>
      <PageHeading eyebrow="Customer ledger" title="Udhar / Khata" description="Track outstanding customer balances and record received payments." />
      <div className="mb-5 grid grid-cols-2 gap-3">
        <StatCard label="Total pending" value={formatCurrency(outstanding)} icon="fa-book-open" tone="rose" />
        <StatCard label="Customers with balance" value={customerBalances.length} icon="fa-users" tone="blue" />
      </div>
      <Panel className="overflow-hidden">
        <PanelTitle title="Customer balances" subtitle="Only customers with an outstanding balance are listed." />
        <div className="p-4 sm:p-5"><TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer or phone..." /></div>
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
          {customers.map((customer) => (
            <article key={customer.key} className="rounded-2xl border border-rose-100 bg-gradient-to-br from-white to-rose-50/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><h2 className="truncate font-extrabold text-slate-800">{customer.name}</h2><p className="mt-1 text-xs text-slate-500">{customer.phone || 'No phone number'} · {customer.bills} udhar bills</p></div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700"><i className="fa-solid fa-user" aria-hidden="true" /></span>
              </div>
              <div className="mt-4 flex items-end justify-between gap-2 border-t border-rose-100 pt-3">
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Balance due</p><p className="mt-0.5 text-xl font-black text-rose-700">{formatCurrency(customer.balance)}</p></div>
                <Button onClick={() => { setSelected(customer); setAmount(String(customer.balance)); setError('') }} className="min-h-9 px-3 text-xs"><i className="fa-solid fa-hand-holding-dollar" aria-hidden="true" /> Receive</Button>
              </div>
            </article>
          ))}
          {!customers.length && <div className="col-span-full"><EmptyState icon="fa-circle-check" title={query ? 'No matching customers' : 'No pending balances'} description={query ? 'Try a different name or phone number.' : 'Udhar bills will appear here.'} /></div>}
        </div>
      </Panel>
      <Panel className="mt-5 overflow-hidden">
        <PanelTitle title="Recent payments" subtitle="Customer repayments recorded against khata balances" />
        {payments.length ? <div className="divide-y divide-slate-100">{payments.slice(0, 8).map((payment) => <div key={payment.id} className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5"><div><p className="text-sm font-bold text-slate-800">{payment.customerName || payment.customerKey}</p><p className="mt-0.5 text-[11px] text-slate-500">{formatDate(payment.timestamp)} · {payment.paymentMethod}{payment.onlineAccount ? ` / ${payment.onlineAccount}` : ''}</p></div><p className="text-sm font-black text-emerald-700">{formatCurrency(payment.amount)}</p></div>)}</div> : <EmptyState icon="fa-money-bill-transfer" title="No payments received yet" description="Payments against customer balances will appear here." />}
      </Panel>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Receive khata payment">
          <Panel className="w-full max-w-md overflow-hidden">
            <PanelTitle title="Receive payment" subtitle={selected.name} action={<button type="button" onClick={() => setSelected(null)} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><i className="fa-solid fa-xmark" /></button>} />
            <form onSubmit={submitPayment} className="space-y-4 p-5">
              <div className="rounded-xl bg-rose-50 p-3 text-sm"><span className="text-slate-600">Pending balance</span><strong className="float-right text-rose-700">{formatCurrency(selected.balance)}</strong></div>
              <label className="block text-xs font-bold text-slate-600">Amount received<TextInput type="number" min="1" max={selected.balance} step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1" /></label>
              <div className="grid grid-cols-2 gap-2">{['Cash', 'Digital'].map((item) => <button type="button" key={item} onClick={() => setMethod(item)} className={`min-h-10 rounded-xl border text-sm font-bold ${method === item ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{item}</button>)}</div>
              {method === 'Digital' && <select value={account} onChange={(event) => setAccount(event.target.value)} className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">{['JazzCash', 'EasyPaisa', settings.bankName || 'Bank'].map((name) => <option key={name}>{name}</option>)}</select>}
              {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
              <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setSelected(null)}>Cancel</Button><Button type="submit">Save payment</Button></div>
            </form>
          </Panel>
        </div>
      )}
    </div>
  )
}
