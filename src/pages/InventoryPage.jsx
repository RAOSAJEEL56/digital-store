import { useMemo, useState } from 'react'
import { useStore } from '../context/store.js'
import { formatCurrency } from '../utils/format.js'
import { Button, EmptyState, PageHeading, Panel, PanelTitle, StatCard, TextInput } from '../components/common/UI.jsx'

const emptyProduct = { id: '', barcode: '', name: '', category: 'Groceries', cost: '', price: '', stock: '', unit: 'pc' }

export default function InventoryPage() {
  const { products, setProducts, upsertProduct } = useStore()
  const [query, setQuery] = useState('')
  const [stockFilter, setStockFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [draft, setDraft] = useState(emptyProduct)
  const [error, setError] = useState('')
  const categories = [...new Set(products.map((product) => product.category))]
  const visibleProducts = useMemo(() => products.filter((product) => {
    const matches = `${product.name} ${product.id} ${product.barcode || ''} ${product.category}`.toLowerCase().includes(query.toLowerCase())
    const stockMatches = stockFilter === 'all' || (stockFilter === 'low' && product.stock > 0 && product.stock <= 10) || (stockFilter === 'out' && product.stock <= 0)
    return matches && stockMatches
  }), [products, query, stockFilter])
  const lowCount = products.filter((product) => product.stock > 0 && product.stock <= 10).length
  const stockValue = products.reduce((sum, product) => sum + Number(product.cost || 0) * Number(product.stock || 0), 0)

  const openEditor = (product = null) => {
    setIsModalOpen(true)
    setEditing(product)
    setDraft(product ? { ...product } : { ...emptyProduct })
    setError('')
  }

  const saveProduct = (event) => {
    event.preventDefault()
    const name = draft.name.trim()
    const cost = Number(draft.cost)
    const price = Number(draft.price)
    const stock = Number(draft.stock)
    if (!name || !Number.isFinite(cost) || cost < 0 || !Number.isFinite(price) || price < 0 || !Number.isFinite(stock) || stock < 0) {
      setError('Name, cost, selling price aur valid stock enter karein.')
      return
    }
    const id = editing?.id || `PROD-${Date.now().toString().slice(-6)}`
    upsertProduct({ ...draft, id, name, cost, price, stock })
    setIsModalOpen(false)
  }

  const deleteProduct = (product) => {
    if (window.confirm(`"${product.name}" ko stock list se remove karna hai?`)) {
      setProducts((current) => current.filter((item) => item.id !== product.id))
    }
  }

  const addStock = (product) => {
    const input = window.prompt(`${product.name} mein kitni units add karni hain?`, '10')
    if (input === null) return
    const amount = Number(input)
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert('Valid positive quantity enter karein.')
      return
    }
    setProducts((current) => current.map((item) => item.id === product.id ? { ...item, stock: item.stock + amount } : item))
  }

  return (
    <div>
      <PageHeading eyebrow="Products & quantities" title="Stock inventory" description="Manage product details, prices and on-hand stock." action={<Button onClick={() => openEditor()}><i className="fa-solid fa-plus" aria-hidden="true" /> Add product</Button>} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Products" value={products.length.toLocaleString()} icon="fa-boxes-stacked" />
        <StatCard label="Low stock" value={lowCount.toLocaleString()} icon="fa-triangle-exclamation" tone="amber" detail="10 units or fewer" />
        <div className="col-span-2 lg:col-span-1"><StatCard label="Stock cost value" value={formatCurrency(stockValue)} icon="fa-coins" tone="blue" /></div>
      </div>
      <Panel className="overflow-hidden">
        <PanelTitle title="All products" subtitle={`${visibleProducts.length} shown`} />
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:p-5">
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, code or category..." />
          <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500">
            <option value="all">All stock</option><option value="low">Low stock</option><option value="out">Out of stock</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              <tr><th className="px-5 py-3">Product</th><th className="px-4 py-3">Category</th><th className="px-4 py-3 text-right">Cost</th><th className="px-4 py-3 text-right">Price</th><th className="px-4 py-3 text-right">Margin</th><th className="px-4 py-3 text-center">Stock</th><th className="px-5 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleProducts.map((product) => {
                const margin = product.price - product.cost
                const low = product.stock <= 10
                return (
                  <tr key={product.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-3"><p className="font-extrabold text-slate-800">{product.name}</p><p className="mt-0.5 font-mono text-[10px] text-slate-400">{product.id}</p></td>
                    <td className="px-4 py-3"><span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">{product.category}</span></td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-600">{formatCurrency(product.cost)}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-800">{formatCurrency(product.price)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatCurrency(margin)}</td>
                    <td className="px-4 py-3 text-center"><span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${product.stock === 0 ? 'bg-rose-100 text-rose-700' : low ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{product.stock} {product.unit}</span></td>
                    <td className="px-5 py-3"><div className="flex justify-end gap-2">
                      <button type="button" onClick={() => addStock(product)} title="Add stock" className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"><i className="fa-solid fa-plus text-xs" aria-hidden="true" /></button>
                      <button type="button" onClick={() => openEditor(product)} title="Edit product" className="h-8 w-8 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"><i className="fa-solid fa-pen text-xs" aria-hidden="true" /></button>
                      <button type="button" onClick={() => deleteProduct(product)} title="Delete product" className="h-8 w-8 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100"><i className="fa-solid fa-trash text-xs" aria-hidden="true" /></button>
                    </div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!visibleProducts.length && <EmptyState title="No products found" description="Try a different search or add a product." />}
        </div>
      </Panel>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Product details">
          <Panel className="w-full max-w-lg overflow-hidden">
            <PanelTitle title={editing ? 'Edit product' : 'Add product'} action={<button type="button" onClick={() => setIsModalOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close"><i className="fa-solid fa-xmark" /></button>} />
            <form onSubmit={saveProduct} className="space-y-4 p-5">
              <label className="block text-xs font-bold text-slate-600">Product name<TextInput required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1" placeholder="Product name" /></label>
              <label className="block text-xs font-bold text-slate-600">Barcode (optional)<TextInput value={draft.barcode || ''} onChange={(event) => setDraft({ ...draft, barcode: event.target.value })} className="mt-1" placeholder="Scan code printed on the product" /></label>
              <label className="block text-xs font-bold text-slate-600">Category<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className="mt-1 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-emerald-500">{[...new Set(['Groceries', 'Pulses/Dal', 'Snacks/Beverages', 'Dairy', 'Spices', 'Household', ...categories])].map((item) => <option key={item}>{item}</option>)}</select></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-bold text-slate-600">Cost price<TextInput type="number" min="0" step="0.01" required value={draft.cost} onChange={(event) => setDraft({ ...draft, cost: event.target.value })} className="mt-1" /></label>
                <label className="text-xs font-bold text-slate-600">Selling price<TextInput type="number" min="0" step="0.01" required value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} className="mt-1" /></label>
                <label className="text-xs font-bold text-slate-600">Quantity<TextInput type="number" min="0" step="0.001" required value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: event.target.value })} className="mt-1" /></label>
                <label className="text-xs font-bold text-slate-600">Unit<select value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} className="mt-1 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"><option>pc</option><option>packet</option><option>kg</option><option>g</option><option>liter</option><option>bottle</option><option>dozen</option></select></label>
              </div>
              {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
              <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button type="submit">Save product</Button></div>
            </form>
          </Panel>
        </div>
      )}
    </div>
  )
}
