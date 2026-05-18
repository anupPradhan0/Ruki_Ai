import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import type { Transaction } from "@/lib/api"
import { fmtINR } from "@/lib/utils"

interface Props {
  txn: Transaction
  onEdit: () => void
  onDelete: () => void
}

const CATEGORY_EMOJI: Record<string, string> = {
  food: "🍔",
  transport: "🚖",
  rent: "🏠",
  bills: "💡",
  shopping: "🛍️",
  entertainment: "🎬",
  health: "💊",
  education: "📚",
  savings: "💰",
  salary: "💼",
  other_income: "📈",
  other: "💳",
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

export default function TransactionRow({ txn, onEdit, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false)
  const isIncome = txn.type === "income"
  return (
    <div className="flex items-center gap-3 bg-[#111] border border-white/5 rounded-xl px-4 py-3 hover:border-white/10 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-lg shrink-0">
        {CATEGORY_EMOJI[txn.category] ?? "💳"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">
          {txn.merchant || txn.note || (
            <span className="capitalize">{txn.category.replace("_", " ")}</span>
          )}
        </div>
        <div className="text-xs text-white/40 capitalize">
          {txn.category.replace("_", " ")} · {fmtDate(txn.occurred_at)}
        </div>
      </div>
      <div className={`text-sm font-medium ${isIncome ? "text-emerald-400" : "text-white"}`}>
        {isIncome ? "+" : "-"}
        {fmtINR(txn.amount)}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Edit"
        >
          <Pencil size={14} />
        </button>
        {confirming ? (
          <>
            <button
              type="button"
              onClick={onDelete}
              className="px-2 py-1 rounded-lg text-xs text-red-400 hover:bg-red-500/10"
            >
              Sure?
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="px-2 py-1 rounded-lg text-xs text-white/40 hover:bg-white/5"
            >
              No
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            aria-label="Delete"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
