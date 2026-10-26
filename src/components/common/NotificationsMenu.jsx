import { useState } from 'react'
import { useStore } from '../../context/store.js'
import { Panel } from './UI.jsx'

const notificationIcons = {
  sale: 'fa-receipt',
  payment: 'fa-money-bill-transfer',
  stock: 'fa-boxes-stacked',
  settings: 'fa-sliders',
}

export default function NotificationsMenu() {
  const { notifications, removeNotification, clearNotifications } = useStore()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={`Notifications${notifications.length ? `, ${notifications.length} saved` : ''}`}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:h-10 sm:w-10"
      >
        <i className="fa-solid fa-bell text-base" aria-hidden="true" />
        {notifications.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[#00664f] bg-rose-500 px-1 text-[9px] font-black leading-none text-white">
            {notifications.length > 99 ? '99+' : notifications.length}
          </span>
        )}
      </button>
      {open && (
        <Panel className="absolute right-0 top-[calc(100%+12px)] z-50 w-[min(340px,calc(100vw-1.5rem))] overflow-hidden shadow-xl">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-800">Notifications</h2>
              <p className="text-[10px] text-slate-500">{notifications.length} saved</p>
            </div>
            {notifications.length > 0 && (
              <button type="button" onClick={clearNotifications} className="text-[10px] font-bold text-rose-600 hover:text-rose-800">
                Clear all
              </button>
            )}
          </div>
          <div className="max-h-[min(420px,65dvh)] overflow-y-auto">
            {notifications.length ? notifications.map((notification) => (
              <div key={notification.id} className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <i className={`fa-solid ${notificationIcons[notification.type] || 'fa-bell'} text-xs`} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold text-slate-800">{notification.title}</p>
                  <p className="mt-0.5 break-words text-[11px] leading-4 text-slate-600">{notification.message}</p>
                  <time className="mt-1 block text-[9px] text-slate-400" dateTime={notification.timestamp}>
                    {new Date(notification.timestamp).toLocaleString()}
                  </time>
                </div>
                <button
                  type="button"
                  onClick={() => removeNotification(notification.id)}
                  aria-label={`Remove ${notification.title} notification`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <i className="fa-solid fa-xmark text-xs" aria-hidden="true" />
                </button>
              </div>
            )) : (
              <div className="px-4 py-10 text-center">
                <i className="fa-regular fa-bell-slash text-2xl text-slate-300" aria-hidden="true" />
                <p className="mt-2 text-xs font-bold text-slate-600">No notifications yet</p>
                <p className="mt-1 text-[10px] text-slate-400">Sales, payments and stock updates will appear here.</p>
              </div>
            )}
          </div>
        </Panel>
      )}
    </div>
  )
}
