import { useEffect, useMemo, useState } from 'react'
import { defaultProducts } from '../data/products.js'
import { getCustomerKey } from '../utils/format.js'
import { StoreContext } from './store.js'

const STORAGE_KEYS = {
  products: 'kiryana_products',
  sales: 'kiryana_sales',
  payments: 'kiryana_khata_payments',
  settings: 'kiryana_settings',
  notifications: 'digital_store_notifications',
  users: 'digital_store_users',
  activeUser: 'digital_store_active_user',
}
const PASSWORD_ITERATIONS = 120000
const DEFAULT_SETTINGS = {
  appTitle: 'Digital Store',
  storeName: 'Digital Store',
  storePhone: '',
  storeAddress: '',
  jazzCash: '',
  easyPaisa: '',
  bankName: '',
  bankAccount: '',
}
const EMPTY_SETTINGS = Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map((key) => [key, '']))

function readSaved(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch (error) {
    console.error(`Could not read saved store data for "${key}".`, error)
    return fallback
  }
}

async function hashPassword(password, salt) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Password security ke liye secure browser connection zaroori hai.')
  }
  const passwordKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PASSWORD_ITERATIONS },
    passwordKey,
    256,
  )
  return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex) {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) return null
  return new Uint8Array(hex.match(/.{2}/g).map((byte) => Number.parseInt(byte, 16)))
}

export function StoreProvider({ children }) {
  const [products, setProducts] = useState(() => readSaved(STORAGE_KEYS.products, defaultProducts))
  const [sales, setSales] = useState(() => readSaved(STORAGE_KEYS.sales, []))
  const [payments, setPayments] = useState(() => readSaved(STORAGE_KEYS.payments, []))
  const [notifications, setNotifications] = useState(() => readSaved(STORAGE_KEYS.notifications, []))
  const [settings, setSettings] = useState(() => {
    const savedSettings = readSaved(STORAGE_KEYS.settings, {})
    return {
      ...DEFAULT_SETTINGS,
      appTitle: savedSettings.appTitle || savedSettings.name || DEFAULT_SETTINGS.appTitle,
      storeName: savedSettings.storeName || savedSettings.name || DEFAULT_SETTINGS.storeName,
      ...savedSettings,
    }
  })
  const [users, setUsers] = useState(() => readSaved(STORAGE_KEYS.users, []))
  const [activeUser, setActiveUser] = useState(() => {
    const userId = readSaved(STORAGE_KEYS.activeUser, null)
    return readSaved(STORAGE_KEYS.users, []).find((user) => user.id === userId) || null
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products))
  }, [products])
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(sales))
  }, [sales])
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.payments, JSON.stringify(payments))
  }, [payments])
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings))
  }, [settings])
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(notifications))
  }, [notifications])

  const addNotification = (notification) => {
    const newNotification = {
      ...notification,
      id: globalThis.crypto?.randomUUID?.() || `NOTICE-${Date.now()}`,
      timestamp: new Date().toISOString(),
    }
    setNotifications((current) => [newNotification, ...current])
    return newNotification
  }

  const removeNotification = (id) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id))
  }

  const clearNotifications = () => setNotifications([])

  const addSale = (sale) => {
    const customerKey = getCustomerKey(sale)
    const existingCustomer = sales.find((existingSale) => {
      if (existingSale.customerPhone && existingSale.customerPhone !== 'N/A' && sale.customerPhone && sale.customerPhone !== 'N/A') {
        return existingSale.customerPhone === sale.customerPhone
      }
      return (existingSale.customerName || '').trim().toLowerCase() === (sale.customerName || '').trim().toLowerCase()
    })
    const knownCustomerIds = sales
      .map((existingSale) => Number(existingSale.customerId))
      .filter((id) => Number.isInteger(id) && id > 0)
    const nextCustomerId = existingCustomer?.customerId || String(Math.max(0, ...knownCustomerIds) + 1)
    const newSale = {
      ...sale,
      id: `INV-${Date.now().toString().slice(-7)}`,
      customerId: existingCustomer?.customerId || (customerKey === 'Walk-in' ? '' : nextCustomerId),
      timestamp: new Date().toISOString(),
      grandTotal: Math.max(0, Number(sale.subtotal) - Number(sale.discount || 0)),
      totalCost: sale.items.reduce((total, item) => total + item.cost * item.qty, 0),
    }
    newSale.profit = newSale.grandTotal - newSale.totalCost
    setSales((current) => [newSale, ...current])
    setProducts((current) => current.map((product) => {
      const sold = sale.items.find((item) => item.id === product.id && item.stockTracked !== false)
      return sold ? { ...product, stock: Math.max(0, product.stock - sold.qty) } : product
    }))
    addNotification({
      title: 'Sale completed',
      message: `${newSale.id} · ${newSale.customerName} · Rs. ${newSale.grandTotal.toLocaleString()}`,
      type: 'sale',
    })
    return newSale
  }

  const addPayment = (payment) => {
    const newPayment = {
      ...payment,
      id: `PAY-${Date.now().toString().slice(-7)}`,
      timestamp: new Date().toISOString(),
    }
    setPayments((current) => [newPayment, ...current])
    addNotification({
      title: 'Khata payment received',
      message: `${newPayment.customerName || 'Customer'} · Rs. ${Number(newPayment.amount || 0).toLocaleString()}`,
      type: 'payment',
    })
    return newPayment
  }

  const upsertProduct = (product) => {
    const isNew = !products.some((item) => item.id === product.id)
    setProducts((current) => {
      const exists = current.some((item) => item.id === product.id)
      return exists
        ? current.map((item) => item.id === product.id ? product : item)
        : [product, ...current]
    })
    addNotification({
      title: isNew ? 'Product added to stock' : 'Stock item updated',
      message: `${product.name} · ${product.stock} ${product.unit} in stock`,
      type: 'stock',
    })
  }

  const signUp = async ({ name, email, password, avatar = '' }) => {
    const normalizedEmail = email.trim().toLowerCase()
    if (users.some((user) => user.email === normalizedEmail)) {
      throw new Error('Is email se account pehle se maujood hai. Login karein.')
    }
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const user = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: normalizedEmail,
      avatar,
      salt: bytesToHex(salt),
      passwordHash: await hashPassword(password, salt),
    }
    const nextUsers = [...users, user]
    try {
      localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(nextUsers))
      localStorage.setItem(STORAGE_KEYS.activeUser, JSON.stringify(user.id))
    } catch (error) {
      throw new Error(`Account save nahi ho saka: ${error.message}`, { cause: error })
    }
    setUsers(nextUsers)
    setActiveUser(user)
  }

  const login = async ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase()
    const user = users.find((item) => item.email === normalizedEmail)
    const salt = user ? hexToBytes(user.salt) : null
    if (!user || !salt || await hashPassword(password, salt) !== user.passwordHash) {
      throw new Error('Email ya password ghalat hai.')
    }
    try {
      localStorage.setItem(STORAGE_KEYS.activeUser, JSON.stringify(user.id))
    } catch (error) {
      throw new Error(`Login save nahi ho saka: ${error.message}`, { cause: error })
    }
    setActiveUser(user)
  }

  const logout = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify([]))
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(EMPTY_SETTINGS))
      localStorage.removeItem(STORAGE_KEYS.activeUser)
    } catch (error) {
      throw new Error(`Logout nahi ho saka: ${error.message}`, { cause: error })
    }
    setNotifications([])
    setSettings(EMPTY_SETTINGS)
    setActiveUser(null)
  }

  const updateUserProfile = ({ name, avatar }) => {
    if (!activeUser) throw new Error('Profile update karne ke liye pehle login karein.')
    const updatedUser = { ...activeUser, name: name.trim() || activeUser.name, avatar: avatar ?? activeUser.avatar }
    const nextUsers = users.map((user) => user.id === activeUser.id ? updatedUser : user)
    try {
      localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(nextUsers))
    } catch (error) {
      throw new Error(`Profile save nahi ho saka: ${error.message}`, { cause: error })
    }
    setUsers(nextUsers)
    setActiveUser(updatedUser)
  }

  const customerBalances = useMemo(() => {
    const balances = new Map()
    sales.filter((sale) => sale.paymentMethod === 'Udhar').forEach((sale) => {
      const key = getCustomerKey(sale)
      const existing = balances.get(key) || {
        key,
        name: sale.customerName || 'Customer',
        phone: sale.customerPhone || '',
        balance: 0,
        bills: 0,
      }
      existing.balance += Number(sale.grandTotal || 0)
      existing.bills += 1
      balances.set(key, existing)
    })
    payments.forEach((payment) => {
      const existing = balances.get(payment.customerKey)
      if (existing) existing.balance = Math.max(0, existing.balance - Number(payment.amount || 0))
    })
    return [...balances.values()].filter((customer) => customer.balance > 0)
  }, [sales, payments])

  const value = {
    products, setProducts, sales, setSales, payments, setPayments, settings, setSettings,
    addSale, addPayment, upsertProduct, customerBalances,
    notifications, addNotification, removeNotification, clearNotifications,
    users, activeUser, signUp, login, logout, updateUserProfile,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
