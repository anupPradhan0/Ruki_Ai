import { useState } from "react"
import { Loader2 } from "lucide-react"
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type Category,
  type Transaction,
  type TxnType,
} from "@/lib/api"

interface Props {
  initial?: Transaction
  onSubmit: (data: {
    amount: number
    type: TxnType
    category: Category
    merchant: string
    note: string
    occurred_at: string
  }) => Promise<void>
  onCancel?: () => void
}

function toDateInput(iso: string | undefined): string {
  if (!iso) return new Date().toISOString().slice(0, 10)
  return iso.slice(0, 10)
}

export default function TransactionForm({ initial, onSubmit, onCancel }: Props) {
  const [amount, setAmount] = useState<string>(initial ? String(initial.amount) : "")
  const [type, setType] = useState<TxnType>(initial?.type ?? "expense")
  const [category, setCategory] = useState<Category>(initial?.category ?? "food")
  const [merchant, setMerchant] = useState(initial?.merchant ?? "")
  const [note, setNote] = useState(initial?.note ?? "")
  const [date, setDate] = useState(toDateInput(initial?.occurred_at))
  const [busy, setBusy] = useState(false)

  const categoryList = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = parseFloat(amount)
    if (!value || value <= 0) return
    setBusy(true)
    try {
      await onSubmit({
        amount: value,
        type,
        category,
        merchant: merchant.trim(),
        note: note.trim(),
        occurred_at: new Date(date).toISOString(),
      })
    } finally {
      setBusy(false)
    }
  }

  const handleTypeChange = (next: TxnType) => {
    setType(next)
    const list = next === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
    if (!list.includes(category)) setCategory(list[0])
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#111] border border-white/10 rounded-xl p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/50 mb-1 block">Type</label>
          <div className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  type === t
                    ? "bg-[#FFD700]/10 border-[#FFD700]/40 text-white"
                    : "bg-transparent border-white/10 text-white/60 hover:text-white"
                }`}
              >
                {t === "expense" ? "Expense" : "Income"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1 block">Amount (₹)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            required
            className="w-full bg-[#0F0F0F] border border-white/10 rounded-lg px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-[#FFD700]/50"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/50 mb-1 block">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full bg-[#0F0F0F] border border-white/10 rounded-lg px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-[#FFD700]/50 capitalize"
          >
            {categoryList.map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1 block">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full bg-[#0F0F0F] border border-white/10 rounded-lg px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-[#FFD700]/50"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-white/50 mb-1 block">Merchant (optional)</label>
        <input
          type="text"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="Swiggy, Uber, etc."
          className="w-full bg-[#0F0F0F] border border-white/10 rounded-lg px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-[#FFD700]/50"
        />
      </div>

      <div>
        <label className="text-xs text-white/50 mb-1 block">Note (optional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Lunch with team"
          className="w-full bg-[#0F0F0F] border border-white/10 rounded-lg px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-[#FFD700]/50"
        />
      </div>

      <div className="flex items-center gap-2 justify-end pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={busy || !amount}
          className="px-4 py-2 rounded-lg text-sm bg-[#FFD700] text-black font-medium hover:bg-[#FFD700]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          {initial ? "Save" : "Add"}
        </button>
      </div>
    </form>
  )
}
