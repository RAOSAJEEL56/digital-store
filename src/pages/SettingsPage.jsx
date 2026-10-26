import { useRef, useState } from 'react'
import { Button, PageHeading, Panel, PanelTitle, TextInput } from '../components/common/UI.jsx'
import { useStore } from '../context/store.js'

export default function SettingsPage() {
  const { products, setProducts, sales, setSales, payments, setPayments, settings, setSettings, addNotification } = useStore()
  const [draft, setDraft] = useState(settings)
  const [notice, setNotice] = useState('')
  const importInput = useRef(null)

  const saveSettings = (event) => {
    event.preventDefault()
    const savedSettings = { ...draft, storeName: draft.storeName.trim() || 'Digital Store', appTitle: draft.appTitle.trim() || 'Digital Store' }
    setSettings(savedSettings)
    setDraft(savedSettings)
    addNotification({ title: 'Store settings updated', message: 'Store and payment account settings were saved.', type: 'settings' })
    setNotice('Store settings saved.')
    window.setTimeout(() => setNotice(''), 3000)
  }

  const exportBackup = () => {
    const backup = { version: 1, exportedAt: new Date().toISOString(), products, sales, payments, settings }
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `digital-store-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importBackup = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const backup = JSON.parse(await file.text())
      const nextProducts = backup.products || backup.kiryana_products
      const nextSales = backup.sales || backup.kiryana_sales
      const nextPayments = backup.payments || backup.kiryana_khata_payments || backup.khataPayments || []
      if (!Array.isArray(nextProducts) || !Array.isArray(nextSales) || !Array.isArray(nextPayments)) {
        throw new Error('Backup file mein products aur sales arrays honi chahiye.')
      }
      if (!window.confirm('Restore se current store data replace ho jayega. Continue?')) return
      setProducts(nextProducts)
      setSales(nextSales)
      setPayments(nextPayments)
      if (backup.settings || backup.kiryana_settings || backup.storeSettings) {
        const importedSettings = backup.settings || backup.kiryana_settings || backup.storeSettings
        const restoredSettings = {
          ...settings,
          ...importedSettings,
          storeName: importedSettings.storeName || importedSettings.name || settings.storeName,
          appTitle: importedSettings.appTitle || importedSettings.name || settings.appTitle,
          storeAddress: importedSettings.storeAddress || importedSettings.address || settings.storeAddress,
          storePhone: importedSettings.storePhone || importedSettings.phone || settings.storePhone,
        }
        setSettings(restoredSettings)
        setDraft(restoredSettings)
      }
      setNotice('Backup restored successfully.')
      addNotification({ title: 'Store backup restored', message: 'Products, bills, and payment records were restored from a backup.', type: 'settings' })
    } catch (error) {
      window.alert(`Backup restore nahi ho saka: ${error.message}`)
    }
  }

  const resetData = () => {
    if (!window.confirm('Sales, products aur khata payments reset ho jayengi. Is action ko undo nahi kiya ja sakta. Continue?')) return
    localStorage.removeItem('kiryana_products')
    localStorage.removeItem('kiryana_sales')
    localStorage.removeItem('kiryana_khata_payments')
    window.location.reload()
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeading eyebrow="Store configuration" title="Settings" description="Manage your store details and keep a copy of your local data." />
      <Panel className="mb-5 overflow-hidden">
        <PanelTitle title="Store information" subtitle="These details are used in the app header and receipts." />
        <form onSubmit={saveSettings} className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">Store name<TextInput value={draft.storeName || ''} onChange={(event) => setDraft({ ...draft, storeName: event.target.value })} className="mt-1" placeholder="Digital Store" /></label>
            <label className="text-xs font-bold text-slate-600">App title<TextInput value={draft.appTitle || ''} onChange={(event) => setDraft({ ...draft, appTitle: event.target.value })} className="mt-1" placeholder="Digital Store" /></label>
            <label className="text-xs font-bold text-slate-600">Phone number<TextInput value={draft.storePhone || ''} onChange={(event) => setDraft({ ...draft, storePhone: event.target.value })} className="mt-1" placeholder="03xx-xxxxxxx" /></label>
            <label className="text-xs font-bold text-slate-600">Address<TextInput value={draft.storeAddress || ''} onChange={(event) => setDraft({ ...draft, storeAddress: event.target.value })} className="mt-1" placeholder="Store address" /></label>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-3 text-sm font-extrabold text-slate-800">Online accounts</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">JazzCash<TextInput value={draft.jazzCash || ''} onChange={(event) => setDraft({ ...draft, jazzCash: event.target.value })} className="mt-1" placeholder="Account number" /></label>
              <label className="text-xs font-bold text-slate-600">EasyPaisa<TextInput value={draft.easyPaisa || ''} onChange={(event) => setDraft({ ...draft, easyPaisa: event.target.value })} className="mt-1" placeholder="Account number" /></label>
              <label className="text-xs font-bold text-slate-600">Bank name<TextInput value={draft.bankName || ''} onChange={(event) => setDraft({ ...draft, bankName: event.target.value })} className="mt-1" placeholder="Bank name" /></label>
              <label className="text-xs font-bold text-slate-600">Bank account<TextInput value={draft.bankAccount || ''} onChange={(event) => setDraft({ ...draft, bankAccount: event.target.value })} className="mt-1" placeholder="Account / IBAN" /></label>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {notice ? <span className="text-xs font-bold text-emerald-700"><i className="fa-solid fa-circle-check mr-1" />{notice}</span> : <span />}
            <Button type="submit"><i className="fa-solid fa-floppy-disk" aria-hidden="true" /> Save settings</Button>
          </div>
        </form>
      </Panel>

      <Panel className="mb-5 overflow-hidden">
        <PanelTitle title="Backup & restore" subtitle="Your data is stored in this browser on this device." />
        <div className="flex flex-wrap gap-3 p-4 sm:p-5">
          <Button onClick={exportBackup}><i className="fa-solid fa-download" aria-hidden="true" /> Export backup</Button>
          <Button variant="secondary" onClick={() => importInput.current?.click()}><i className="fa-solid fa-upload" aria-hidden="true" /> Restore backup</Button>
          <input ref={importInput} type="file" accept=".json,application/json" onChange={importBackup} className="hidden" />
        </div>
      </Panel>

      <Panel className="overflow-hidden border-rose-200">
        <PanelTitle title="Reset store data" subtitle="This removes the saved products, bills and payment records from this browser." />
        <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
          <p className="max-w-xl text-xs leading-5 text-slate-500">Export a backup first if you need to keep your current store records.</p>
          <Button variant="danger" onClick={resetData}><i className="fa-solid fa-rotate-left" aria-hidden="true" /> Reset data</Button>
        </div>
      </Panel>
    </div>
  )
}
