import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useStore } from '../../context/store.js'
import { formatCurrency } from '../../utils/format.js'
import AccountMenu from './AccountMenu.jsx'
import NotificationsMenu from './NotificationsMenu.jsx'

const links = [
  { to: '/billing', label: 'Billing', icon: 'fa-cash-register' },
  { to: '/khata', label: 'Udhar / Khata', icon: 'fa-book-open' },
  { to: '/stock', label: 'Stock', icon: 'fa-boxes-stacked' },
  { to: '/sales', label: 'Sales history', icon: 'fa-receipt' },
  { to: '/online-payments', label: 'Online payments', icon: 'fa-mobile-screen-button' },
  { to: '/profit', label: 'Profit', icon: 'fa-chart-line' },
  { to: '/analytics', label: 'Analytics', icon: 'fa-chart-pie' },
  { to: '/settings', label: 'Settings', icon: 'fa-sliders' },
]

export default function AppLayout() {
  const { sales, payments, settings, products, activeUser } = useStore()
  const [time, setTime] = useState(() => new Date())
  const todaySales = sales.filter((sale) => new Date(sale.timestamp).toDateString() === new Date().toDateString())
  const todayCash = todaySales.filter((sale) => sale.paymentMethod === 'Cash')
    .reduce((total, sale) => total + Number(sale.grandTotal || 0), 0)
    + payments.filter((payment) => payment.paymentMethod === 'Cash' && new Date(payment.timestamp).toDateString() === new Date().toDateString())
      .reduce((total, payment) => total + Number(payment.amount || 0), 0)
  const todayProfit = todaySales.reduce((total, sale) => total + Number(sale.profit || 0), 0)
  const lowStock = products.filter((product) => product.stock <= 10).length

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    document.title = `${settings.appTitle || settings.storeName || 'Digital Store'}`
  }, [settings.appTitle, settings.storeName])

  return (
    <div className="min-h-screen bg-[#f3f6f4] text-slate-800">
      <header className="sticky top-0 z-40 bg-[#00664f] text-white shadow-md">
        <div className="mx-auto flex h-[60px] max-w-[1600px] items-center justify-between gap-2 px-3 sm:px-6 lg:px-10">
          <NavLink to="/billing" className="flex h-[56px] min-w-0 shrink items-center gap-2.5 rounded-b-2xl border-b-[4px] border-emerald-500 bg-white px-2.5 text-emerald-950 shadow-md sm:gap-3 sm:px-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white sm:h-11 sm:w-11">
              <i className="fa-solid fa-store text-base sm:text-xl" aria-hidden="true" />
            </span>
            <span className="truncate text-base font-black tracking-tight sm:text-xl lg:text-[23px]">
              {settings.storeName || settings.appTitle || 'Digital Store'}
            </span>
          </NavLink>
          <div className="hidden flex-1 items-center justify-center gap-5 md:flex lg:gap-7">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-xs font-semibold text-emerald-100">
              <i className="fa-solid fa-clock text-emerald-300" aria-hidden="true" />
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </div>
            <div className="min-w-[84px] text-center">
              <p className="text-[11px] font-medium text-emerald-100">Today&apos;s Cash</p>
              <p className="text-sm font-extrabold leading-5">{formatCurrency(todayCash)}</p>
            </div>
            <div className="min-w-[84px] text-center">
              <p className="text-[11px] font-medium text-emerald-100">Today&apos;s Profit</p>
              <p className="text-sm font-extrabold leading-5 text-emerald-300">{formatCurrency(todayProfit)}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <NotificationsMenu />
            <AccountMenu />
          </div>
        </div>
      </header>

      <nav className="sticky top-[60px] z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="scrollbar-none mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-2 py-2 sm:px-5">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition sm:px-4 sm:text-sm ${
                isActive
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <i className={`fa-solid ${link.icon}`} aria-hidden="true" />
              {link.label}
              {link.to === '/stock' && lowStock > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800">{lowStock}</span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="mx-auto min-h-[calc(100vh-190px)] w-full max-w-[1600px] px-3 py-5 sm:px-6 sm:py-7">
        <Outlet key={activeUser?.id || 'signed-out'} />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-1 px-4 py-4 text-center text-xs text-slate-500 sm:flex-row sm:px-6">
          <span className="font-semibold text-slate-600">{settings.storeName || 'Digital Store'}</span>
          <span>Sales, stock and accounts — saved securely in this browser.</span>
        </div>
      </footer>
    </div>
  )
}
