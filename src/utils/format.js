export const formatCurrency = (value) =>
  `Rs. ${Number(value || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`

export const formatDate = (value) =>
  value ? new Date(value).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export const getCustomerKey = (sale) =>
  sale.customerPhone && sale.customerPhone !== 'N/A' ? sale.customerPhone : sale.customerName || 'Walk-in'

export function isInPeriod(value, period) {
  const date = new Date(value)
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (period === 'today') return date >= start
  if (period === 'yesterday') {
    const yesterday = new Date(start)
    yesterday.setDate(yesterday.getDate() - 1)
    return date >= yesterday && date < start
  }
  if (period === 'last7') {
    const week = new Date(start)
    week.setDate(week.getDate() - 6)
    return date >= week
  }
  if (period === 'last30') {
    const month = new Date(start)
    month.setDate(month.getDate() - 29)
    return date >= month
  }
  return true
}
