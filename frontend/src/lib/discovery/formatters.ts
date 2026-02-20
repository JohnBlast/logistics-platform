/** Format YYYY-MM to "January 2026" */
export function formatMonthName(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number)
  if (!y || !m) return yyyyMm
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const name = monthNames[m - 1]
  return name ? `${name} ${y}` : yyyyMm
}

/** Format number as percent (e.g. 50.5 -> "50.5%") */
export function formatPercent(n: number): string {
  return `${Number(n).toFixed(1)}%`
}

/** Format number as currency (£) */
export function formatCurrency(n: number): string {
  return `£${Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
