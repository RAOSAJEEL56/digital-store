import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../context/store.js'
import { formatCurrency } from '../utils/format.js'
import { Button, EmptyState, Panel, TextInput } from '../components/common/UI.jsx'

const BarcodeScannerModal = lazy(() => import('../components/common/BarcodeScannerModal.jsx'))

export default function BillingPage() {
  const { products, addSale, settings } = useStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [cart, setCart] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [discount, setDiscount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [onlineAccount, setOnlineAccount] = useState('JazzCash')
  const [receipt, setReceipt] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedQty, setSelectedQty] = useState('1')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [paymentSetupWarning, setPaymentSetupWarning] = useState('')
  const [customItem, setCustomItem] = useState({ name: '', qty: '1', price: '' })
  const digitalAccounts = [
    { name: 'JazzCash', account: settings.jazzCash },
    { name: 'EasyPaisa', account: settings.easyPaisa },
  ].filter(({ account }) => account?.trim())
  const estimatedProfit = cart.reduce((sum, item) => sum + (item.price - item.cost) * item.qty, 0) - (Number(discount) || 0)

  const categoryOrder = ['Groceries', 'Dairy', 'Pulses/Dal', 'Spices', 'Snacks/Beverages', 'Household']
  const categories = ['All', ...[...new Set(products.map((product) => product.category))]
    .sort((first, second) => {
      const firstIndex = categoryOrder.indexOf(first)
      const secondIndex = categoryOrder.indexOf(second)
      return (firstIndex < 0 ? categoryOrder.length : firstIndex) - (secondIndex < 0 ? categoryOrder.length : secondIndex)
    })]
  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesSearch = `${product.name} ${product.id} ${product.barcode || ''}`.toLowerCase().includes(query.trim().toLowerCase())
    return matchesSearch && (category === 'All' || category === product.category)
  }), [category, products, query])
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const total = Math.max(0, subtotal - (Number(discount) || 0))
  const selectedProductRemaining = selectedProduct
    ? selectedProduct.stock - (cart.find((item) => item.id === selectedProduct.id)?.qty || 0)
    : 0

  const openProductDialog = (product) => {
    setSelectedProduct(product)
    setSelectedQty('1')
  }

  const findProductByBarcode = (barcode) => {
    const scannedCode = barcode.trim().toLowerCase()
    const product = products.find((item) => [item.barcode, item.id].some((code) => code?.trim().toLowerCase() === scannedCode))
    if (!product) return { success: false, message: `Barcode "${barcode}" kisi product se match nahi hua. Stock mein barcode add karke dobara scan karein.` }
    if (product.stock <= 0) return { success: false, message: `${product.name} out of stock hai.` }
    setScannerOpen(false)
    openProductDialog(product)
    return { success: true }
  }

  const addSelectedProduct = () => {
    if (!selectedProduct) return
    const quantity = Number(selectedQty)
    const alreadyInCart = cart.find((item) => item.id === selectedProduct.id)?.qty || 0
    const remainingStock = selectedProduct.stock - alreadyInCart
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > remainingStock) return
    setCart((current) => {
      const item = current.find((row) => row.id === selectedProduct.id)
      if (item) {
        return current.map((row) => row.id === selectedProduct.id ? { ...row, qty: row.qty + quantity } : row)
      }
      return [...current, { ...selectedProduct, qty: quantity, stockTracked: true }]
    })
    setSelectedProduct(null)
  }

  const choosePaymentMethod = (method) => {
    setPaymentSetupWarning('')
    if (method === 'Digital') {
      if (!digitalAccounts.length) {
        setPaymentSetupWarning('Digital payment se pehle Settings mein JazzCash ya EasyPaisa account set karein.')
        return
      }
      if (!digitalAccounts.some(({ name }) => name === onlineAccount)) setOnlineAccount(digitalAccounts[0].name)
    }
    if (method === 'Bank' && (!settings.bankName?.trim() || !settings.bankAccount?.trim())) {
      setPaymentSetupWarning('Bank payment se pehle Settings mein bank name aur account / IBAN set karein.')
      return
    }
    setPaymentMethod(method)
  }

  const updateQty = (id, qty) => {
    const product = products.find((item) => item.id === id)
    const nextQty = product ? Math.min(Number(qty), product.stock) : Number(qty)
    setCart((current) => nextQty <= 0
      ? current.filter((item) => item.id !== id)
      : current.map((item) => item.id === id ? { ...item, qty: nextQty } : item))
  }

  const addCustomItem = (event) => {
    event.preventDefault()
    const name = customItem.name.trim()
    const qty = Number(customItem.qty)
    const price = Number(customItem.price)
    if (!name || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) {
      window.alert('Custom items ke liye name, quantity aur valid price enter karein.')
      return
    }
    setCart((current) => [...current, {
      id: `OTHER-${Date.now()}`,
      name,
      qty,
      price,
      cost: 0,
      unit: 'pc',
      stockTracked: false,
    }])
    setCustomItem({ name: '', qty: '1', price: '' })
  }

  const checkout = (event) => {
    event.preventDefault()
    if (!cart.length) return
    if (paymentMethod === 'Udhar' && !customerName.trim()) {
      window.alert('Udhar payment ke liye customer name zaroori hai.')
      return
    }
    if (paymentMethod === 'Digital' && !digitalAccounts.some(({ name }) => name === onlineAccount)) {
      setPaymentSetupWarning('Digital payment ke liye Settings mein valid JazzCash ya EasyPaisa account set karein.')
      return
    }
    if (paymentMethod === 'Bank' && (!settings.bankName?.trim() || !settings.bankAccount?.trim())) {
      setPaymentSetupWarning('Bank payment ke liye Settings mein bank name aur account / IBAN set karein.')
      return
    }
    const sale = addSale({
      items: cart.map(({ id, name, cost, price, unit, qty }) => ({ id, name, cost, price, unit, qty, profit: (price - cost) * qty })),
      subtotal,
      discount: Number(discount) || 0,
      customerName: customerName.trim() || 'Walk-in Customer',
      customerPhone: customerPhone.trim(),
      paymentMethod,
      onlineAccount: paymentMethod === 'Digital' ? onlineAccount : paymentMethod === 'Bank' ? settings.bankName : '',
      paymentStatus: paymentMethod === 'Udhar' ? 'Pending' : 'Paid',
    })
    setReceipt(sale)
    setCart([])
    setDiscount('')
    setCustomerName('')
    setCustomerPhone('')
    setPaymentMethod('Cash')
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2.05fr)_minmax(325px,1fr)] xl:gap-5">
        <div className="min-w-0">
          <Panel className="mb-3 overflow-hidden">
            <div className="space-y-2.5 p-3">
              <div className="relative flex-1">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-sm text-slate-400" aria-hidden="true" />
                <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product / scan barcode" aria-label="Search product or barcode" className="min-h-9 rounded-lg border-slate-300 pl-9 pr-12 text-xs" />
                <button type="button" onClick={() => setScannerOpen(true)} aria-label="Scan barcode" title="Scan barcode" className="absolute right-1 top-1 flex h-7 w-8 items-center justify-center rounded-md bg-emerald-600 text-white transition hover:bg-emerald-700">
                  <i className="fa-solid fa-barcode text-sm" aria-hidden="true" />
                </button>
              </div>
              <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-0.5">
                {categories.map((item) => (
                  <button
                    type="button"
                    key={item}
                    aria-pressed={category === item}
                    onClick={() => setCategory(item)}
                    className={`min-h-7 shrink-0 rounded-full px-3 text-[10px] font-extrabold transition ${
                      category === item
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </Panel>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => {
                const out = product.stock <= 0
                return (
                  <button
                    type="button"
                    key={product.id}
                    disabled={out}
                    onClick={() => openProductDialog(product)}
                    className="group flex min-h-[116px] min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-2.5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 sm:p-3"
                  >
                    <span className="flex min-w-0 items-center justify-between gap-1">
                      <span className="truncate text-[8px] font-extrabold uppercase tracking-wide text-slate-400">{product.category}</span>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] font-extrabold ${product.stock <= 10 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{product.stock} {product.unit}</span>
                    </span>
                    <span className="mt-1.5 line-clamp-2 min-h-7 text-[10px] font-extrabold leading-[1.25] text-slate-900">{product.name}</span>
                    <span className="mt-0.5 truncate text-[9px] text-slate-400">CP: {formatCurrency(product.cost)} / {product.unit}</span>
                    <span className="mt-auto flex w-full items-center justify-between border-t border-slate-100 pt-1.5">
                      <span className="text-xs font-black text-emerald-700">{formatCurrency(product.price)}</span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white transition group-hover:bg-emerald-700"><i className="fa-solid fa-plus text-[10px]" aria-hidden="true" /></span>
                    </span>
                  </button>
                )
              })}
          </div>
          {!filteredProducts.length && <Panel className="mt-3"><EmptyState title="No products match your search" description="Change the search or category filter and try again." /></Panel>}
          </div>

        <Panel className="h-fit min-w-0 overflow-hidden lg:sticky lg:top-[140px]">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5 sm:px-4">
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
              <i className="fa-solid fa-cart-shopping text-emerald-700" aria-hidden="true" />
              Current Bill
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{cart.length}</span>
            </h2>
            <button type="button" onClick={() => setCart([])} className="text-[10px] font-bold text-rose-600 hover:text-rose-800"><i className="fa-solid fa-trash-can mr-1" />Clear</button>
          </div>
          <form onSubmit={checkout} className="space-y-2.5 p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2">
              <label className="min-w-0 text-[9px] font-extrabold uppercase tracking-wide text-slate-500">
                Customer name <span className="text-rose-600">*</span>
                <TextInput value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Customer name" aria-label="Customer name" className="mt-1 min-h-8 rounded-md px-2 py-1 text-[10px]" />
              </label>
              <label className="min-w-0 text-[9px] font-extrabold uppercase tracking-wide text-slate-500">
                Phone
                <TextInput value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="03xx / 92xx" aria-label="Customer phone" className="mt-1 min-h-8 rounded-md px-2 py-1 text-[10px]" />
              </label>
            </div>

            <div className="max-h-[210px] min-h-[150px] space-y-1.5 overflow-y-auto pr-0.5">
              {!cart.length ? (
                <div className="flex min-h-[100px] flex-col items-center justify-center text-center text-slate-400">
                  <i className="fa-solid fa-basket-shopping text-2xl text-slate-200" aria-hidden="true" />
                  <p className="mt-1 text-[10px]">Cart is empty. Click items to add.</p>
                </div>
              ) : cart.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-extrabold text-slate-800">{item.name}</p>
                    <p className="text-[9px] font-semibold text-slate-500">{formatCurrency(item.price)} / {item.unit}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => updateQty(item.id, item.qty - 1)} aria-label={`Remove one ${item.name}`} className="h-6 w-6 rounded border border-slate-200 bg-white text-xs font-bold text-slate-600">−</button>
                    <span className="w-5 text-center text-[10px] font-black">{item.qty}</span>
                    <button type="button" onClick={() => updateQty(item.id, item.qty + 1)} aria-label={`Add one ${item.name}`} className="h-6 w-6 rounded border border-slate-200 bg-white text-xs font-bold text-slate-600">+</button>
                  </div>
                  <span className="w-16 text-right text-[10px] font-black">{formatCurrency(item.price * item.qty)}</span>
                </div>
              ))}
            </div>

            <div className="rounded-lg border-2 border-amber-400 bg-amber-100 p-2">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase text-amber-950"><i className="fa-solid fa-star mr-1.5" />Other items</p>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[8px] font-extrabold text-amber-900">Bill only</span>
              </div>
              <TextInput value={customItem.name} onChange={(event) => setCustomItem({ ...customItem, name: event.target.value })} placeholder="Item name" aria-label="Custom item name" className="min-h-7 rounded-md border-amber-200 px-2 py-1 text-[10px]" />
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <span className="shrink-0 text-[9px] font-bold text-amber-950">Qty:</span>
                {[1, 2, 3, 4, 5, 6, 7].map((quantity) => (
                  <button type="button" key={quantity} onClick={() => setCustomItem({ ...customItem, qty: String(quantity) })} className={`h-6 min-w-6 rounded border px-1 text-[9px] font-bold ${Number(customItem.qty) === quantity ? 'border-amber-700 bg-amber-300 text-amber-950' : 'border-amber-300 bg-white text-slate-800'}`}>{quantity}</button>
                ))}
                <input type="number" min="1" value={customItem.qty} onChange={(event) => setCustomItem({ ...customItem, qty: event.target.value })} aria-label="Custom item quantity" className="h-6 w-12 min-w-0 rounded border border-amber-300 bg-white px-1 text-center text-[9px] font-bold outline-none" />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <span className="shrink-0 text-[9px] font-bold text-amber-950">Price:</span>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((price) => (
                  <button type="button" key={price} onClick={() => setCustomItem({ ...customItem, price: String(price) })} className={`h-6 min-w-6 rounded border px-1 text-[9px] font-bold ${Number(customItem.price) === price ? 'border-amber-700 bg-amber-300 text-amber-950' : 'border-amber-300 bg-white text-slate-800'}`}>{price}</button>
                ))}
                <input type="number" min="0.01" step="0.01" value={customItem.price} onChange={(event) => setCustomItem({ ...customItem, price: event.target.value })} placeholder="Price" aria-label="Custom item price" className="h-6 w-14 min-w-0 rounded border border-amber-300 bg-white px-1 text-right text-[9px] font-bold outline-none" />
                <button type="button" onClick={addCustomItem} className="flex h-7 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500 text-sm font-black text-white hover:bg-amber-600" aria-label="Add other item to bill"><i className="fa-solid fa-plus" /></button>
              </div>
              <p className="mt-1 text-[8px] font-medium text-amber-900">Tap a number or type your own.</p>
            </div>

            <div className="space-y-1 border-t border-slate-200 pt-2 text-[10px]">
              <label className="flex items-center justify-between gap-2 font-semibold text-slate-600">
                <span>Discount:</span>
                <span className="flex w-24 items-center rounded border border-slate-300 bg-white px-1.5">
                  <input type="number" min="0" max={subtotal} value={discount} onChange={(event) => setDiscount(event.target.value)} placeholder="0" className="min-h-6 w-full bg-transparent text-right text-[10px] font-bold outline-none" />
                  <span className="ml-1 border-l border-slate-200 pl-1 text-[9px]">Rs.</span>
                </span>
              </label>
              <div className="flex justify-between font-semibold text-slate-500"><span>Subtotal:</span><span className="font-bold text-slate-800">{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between font-semibold text-slate-500"><span>Discount:</span><span className="font-bold text-emerald-700">- {formatCurrency(Number(discount) || 0)}</span></div>
              <div className="flex justify-between font-semibold text-slate-500"><span>Profit:</span><span className="font-bold text-emerald-700">{formatCurrency(estimatedProfit)}</span></div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 text-sm font-black text-slate-900"><span>Grand Total:</span><span className="text-base text-emerald-700">{formatCurrency(total)}</span></div>
            </div>

            <div>
              <p className="mb-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Payment</p>
              <div className="grid grid-cols-3 gap-1">
                {['Cash', 'Digital', 'Bank', 'Udhar'].map((method) => (
                  <button type="button" key={method} onClick={() => choosePaymentMethod(method)} className={`flex min-h-9 flex-col items-center justify-center gap-0.5 rounded-md border text-[9px] font-extrabold transition ${paymentMethod === method ? 'border-emerald-600 bg-emerald-100 text-emerald-900' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                    <i className={`fa-solid ${method === 'Cash' ? 'fa-money-bill-wave' : method === 'Digital' ? 'fa-mobile-screen-button' : method === 'Bank' ? 'fa-building-columns' : 'fa-book-open'} text-[10px]`} aria-hidden="true" />
                    {method === 'Udhar' ? 'Udhar' : method}
                  </button>
                ))}
              </div>
            </div>
            {paymentSetupWarning && (
              <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-[10px] font-semibold leading-4 text-amber-900">
                <p>{paymentSetupWarning}</p>
                <Link to="/settings" className="mt-1 inline-flex items-center gap-1 font-extrabold text-emerald-800 underline underline-offset-2">
                  Open Settings <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" aria-hidden="true" />
                </Link>
              </div>
            )}
            {paymentMethod === 'Digital' && (
              <select value={onlineAccount} onChange={(event) => setOnlineAccount(event.target.value)} className="min-h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs outline-none">
                {digitalAccounts.map(({ name }) => <option key={name}>{name}</option>)}
              </select>
            )}
            {paymentMethod === 'Bank' && (
              <p className="rounded-md bg-slate-50 px-2 py-1.5 text-[10px] font-semibold text-slate-600">
                {settings.bankName} · {settings.bankAccount}
              </p>
            )}
            <Button type="submit" disabled={!cart.length || total <= 0} className="min-h-9 w-full rounded-lg bg-emerald-600 py-2 text-[11px] hover:bg-emerald-700">
              <i className="fa-solid fa-print" aria-hidden="true" /> Complete &amp; Print
            </Button>
          </form>
        </Panel>
      </div>

      {scannerOpen && (
        <Suspense fallback={null}>
          <BarcodeScannerModal onClose={() => setScannerOpen(false)} onDetected={findProductByBarcode} />
        </Suspense>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Add ${selectedProduct.name} to bill`}>
          <Panel className="w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl">
            <div className="flex items-start justify-between gap-3 bg-emerald-800 px-5 py-4 text-white">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">{selectedProduct.category}</p>
                <h2 className="mt-0.5 truncate text-base font-extrabold">{selectedProduct.name}</h2>
              </div>
              <button type="button" onClick={() => setSelectedProduct(null)} aria-label="Close product dialog" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg text-emerald-100 hover:bg-white/10">
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5">
                <span className="text-xs font-bold text-slate-600">Price per {selectedProduct.unit}</span>
                <span className="text-sm font-black text-emerald-800">{formatCurrency(selectedProduct.price)}</span>
              </div>
              <label className="block text-xs font-bold text-slate-700">
                Quantity
                <input
                  type="number"
                  min="1"
                  max={selectedProductRemaining}
                  step="1"
                  value={selectedQty}
                  onChange={(event) => setSelectedQty(event.target.value)}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-base font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  autoFocus
                />
              </label>
              <p className="text-[11px] text-slate-500">Available to add: {selectedProductRemaining} {selectedProduct.unit}</p>
              {Number(selectedQty) > 0 && <p className="text-right text-sm font-black text-slate-800">Line total: {formatCurrency(selectedProduct.price * Number(selectedQty))}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setSelectedProduct(null)}>Cancel</Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={!Number.isInteger(Number(selectedQty)) || Number(selectedQty) <= 0 || Number(selectedQty) > selectedProductRemaining}
                  onClick={addSelectedProduct}
                >
                  <i className="fa-solid fa-cart-plus" aria-hidden="true" /> Add to bill
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {receipt && (
        <>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="Invoice">
            <Panel className="flex max-h-[min(580px,92dvh)] w-full max-w-md flex-col overflow-hidden rounded-2xl border-emerald-900/10 shadow-2xl">
              <div className="flex h-[60px] shrink-0 items-center justify-between bg-emerald-800 px-4 text-white">
                <h2 className="flex items-center gap-2 text-base font-extrabold">
                  <i className="fa-solid fa-receipt" aria-hidden="true" /> Invoice
                </h2>
                <button type="button" onClick={() => setReceipt(null)} aria-label="Close invoice" className="flex h-9 w-9 items-center justify-center rounded-lg text-xl font-bold text-emerald-100 transition hover:bg-white/10 hover:text-white">
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-5 font-mono text-[11px] text-slate-800 sm:px-5">
                <div className="border-b border-dashed border-slate-300 pb-3 text-center">
                  <h3 className="text-sm font-black uppercase tracking-wide">{settings.storeName || 'Digital Store'}</h3>
                  {settings.storeAddress && <p className="mt-1 text-[10px] text-slate-600">{settings.storeAddress}</p>}
                  {settings.storePhone && <p className="mt-0.5 text-[10px] text-slate-600">Ph: {settings.storePhone}</p>}
                </div>

                <dl className="space-y-1.5 border-b border-dashed border-slate-300 py-4">
                  <div className="flex justify-between gap-3"><dt>Invoice #:</dt><dd className="text-right font-bold">{receipt.id}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Date:</dt><dd className="text-right">{new Date(receipt.timestamp).toLocaleString()}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Customer:</dt><dd className="text-right font-bold">{receipt.customerName}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Customer ID:</dt><dd className="text-right">{receipt.customerId || '—'}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Payment:</dt><dd className="text-right font-bold uppercase">{receipt.paymentMethod}{receipt.onlineAccount ? ` · ${receipt.onlineAccount}` : ''}</dd></div>
                </dl>

                <table className="my-3 w-full table-fixed border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-500">
                      <th className="w-[43%] py-2 pr-1 font-medium">Item</th>
                      <th className="w-[17%] px-1 py-2 text-right font-medium">Qty</th>
                      <th className="w-[18%] px-1 py-2 text-right font-medium">Price</th>
                      <th className="w-[22%] py-2 pl-1 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 align-top">
                        <td className="break-words py-2 pr-1 font-bold">{item.name}</td>
                        <td className="px-1 py-2 text-right">{item.qty} {item.unit}</td>
                        <td className="px-1 py-2 text-right">{formatCurrency(item.price).replace('Rs. ', '')}</td>
                        <td className="py-2 pl-1 text-right">{formatCurrency(item.price * item.qty).replace('Rs. ', '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="space-y-1.5 border-t border-dashed border-slate-300 pt-3">
                  <div className="flex justify-between gap-3"><span>Subtotal:</span><span>{formatCurrency(receipt.subtotal)}</span></div>
                  <div className="flex justify-between gap-3 text-emerald-700"><span>Discount:</span><span>- {formatCurrency(receipt.discount)}</span></div>
                  <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 text-sm font-black"><span>TOTAL BILL:</span><span>{formatCurrency(receipt.grandTotal)}</span></div>
                </div>

                <div className="mt-4 border-t border-dashed border-slate-300 pt-4 text-center text-slate-500">
                  <p className="font-bold tracking-[0.22em]">♡ Thanks ♡</p>
                  <p className="mt-2 text-[9px]">This is a computer generated slip</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-3 border-t border-slate-200 bg-white px-4 py-3">
                <Button variant="quiet" className="flex-1" onClick={() => setReceipt(null)}>Close</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => window.print()}><i className="fa-solid fa-print" aria-hidden="true" /> Print</Button>
                </div>
            </Panel>
          </div>
          <article className="print-receipt" aria-hidden="true">
            <h2>{settings.storeName || 'Digital Store'}</h2>
            {settings.storeAddress && <p>{settings.storeAddress}</p>}
            {settings.storePhone && <p>{settings.storePhone}</p>}
            <hr />
            <p>{receipt.id}</p>
            <p>{new Date(receipt.timestamp).toLocaleString()}</p>
            <p>Customer: {receipt.customerName}</p>
            <p>Payment: {receipt.paymentMethod}{receipt.onlineAccount ? ` (${receipt.onlineAccount})` : ''}</p>
            <hr />
            {receipt.items.map((item) => (
              <div key={item.id} className="print-receipt-row"><span>{item.name} × {item.qty}</span><span>{formatCurrency(item.price * item.qty)}</span></div>
            ))}
            <hr />
            <div className="print-receipt-row"><span>Subtotal</span><span>{formatCurrency(receipt.subtotal)}</span></div>
            {receipt.discount > 0 && <div className="print-receipt-row"><span>Discount</span><span>-{formatCurrency(receipt.discount)}</span></div>}
            <div className="print-receipt-row print-receipt-total"><span>Total</span><span>{formatCurrency(receipt.grandTotal)}</span></div>
            <p className="print-receipt-thanks">Thank you for shopping!</p>
          </article>
        </>
      )}
    </div>
  )
}
