const EXCHANGE_RATES: Record<string, Record<string, number>> = {
  MXN: { USD: 0.058, EUR: 0.053, GBP: 0.046 },
  USD: { MXN: 17.2, EUR: 0.92, GBP: 0.79 },
  EUR: { MXN: 18.8, USD: 1.09, GBP: 0.86 },
  GBP: { MXN: 21.9, USD: 1.27, EUR: 1.16 },
}

export function convertCurrency(amount: number, from: string, to: string): number {
  if (from === to) return amount
  const rate = EXCHANGE_RATES[from]?.[to]
  if (!rate) return amount
  return Math.round(amount * rate * 100) / 100
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount)
}
