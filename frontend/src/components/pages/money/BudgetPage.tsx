import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { api, EXPENSE_CATEGORIES, type Category } from "@/lib/api"
import { currentMonthString, fmtINR } from "@/lib/utils"
import { toast, toastError } from "@/lib/toast"
import { ApiError } from "@/lib/api"

export default function BudgetPage() {
  const qc = useQueryClient()
  const month = currentMonthString()
  const [draft, setDraft] = useState<Partial<Record<Category, string>>>({})

  const { data, isLoading } = useQuery({
    queryKey: ["money", "budget", month],
    queryFn: () => api.money.getBudget(month),
    retry: (count, err) => {
      if (err instanceof ApiError && err.status === 404) return false
      return count < 2
    },
  })

  useEffect(() => {
    if (data?.limits) {
      setDraft(
        Object.fromEntries(
          Object.entries(data.limits).map(([k, v]) => [k, String(v ?? "")]),
        ) as Partial<Record<Category, string>>,
      )
    }
  }, [data])

  const save = useMutation({
    mutationFn: api.money.upsertBudget,
    onSuccess: () => {
      toast.success("Budget saved")
      qc.invalidateQueries({ queryKey: ["money"] })
    },
    onError: (e) => toastError(e, "Couldn't save budget"),
  })

  const total = Object.values(draft).reduce((sum, v) => sum + (parseFloat(v ?? "") || 0), 0)

  const handleSave = () => {
    const limits = Object.fromEntries(
      Object.entries(draft)
        .map(([k, v]) => [k, parseFloat(v ?? "")] as const)
        .filter(([, v]) => Number.isFinite(v) && v > 0),
    ) as Partial<Record<Category, number>>
    save.mutate({ month, limits })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Budget</h2>
        <p className="text-sm text-white/40 mt-1">
          Set monthly spending limits per category. Leave a row at 0 to skip it.
        </p>
      </div>

      <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-5 space-y-3">
        {EXPENSE_CATEGORIES.map((cat) => (
          <div key={cat} className="flex items-center gap-3">
            <label className="flex-1 text-sm text-white/80 capitalize">{cat.replace("_", " ")}</label>
            <div className="relative w-40">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">₹</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="100"
                value={draft[cat] ?? ""}
                onChange={(e) => setDraft({ ...draft, [cat]: e.target.value })}
                disabled={isLoading}
                placeholder="0"
                className="w-full bg-[#0F0F0F] border border-white/10 rounded-lg pl-7 pr-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-[#FFD700]/50"
              />
            </div>
          </div>
        ))}

        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-sm text-white/60">Total monthly budget</span>
          <span className="text-sm text-white">{fmtINR(total)}</span>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={save.isPending}
          className="px-4 py-2 rounded-lg text-sm bg-[#FFD700] text-black font-medium hover:bg-[#FFD700]/90 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {save.isPending && <Loader2 size={14} className="animate-spin" />}
          Save budget
        </button>
      </div>
    </div>
  )
}
