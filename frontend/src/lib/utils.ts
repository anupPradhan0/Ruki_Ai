import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmtMoney(n: number | null | undefined, currency: string = "INR"): string {
  if (n === undefined || n === null) return "—"
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `${currency} ${n}`
  }
}

// Convenience alias for the common case — INR + treats null/undefined as 0
// (Money pages want "₹0" not "—" when there's no spend yet).
export function fmtINR(n: number | null | undefined): string {
  return fmtMoney(n ?? 0, "INR")
}

export function currentMonthString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}
