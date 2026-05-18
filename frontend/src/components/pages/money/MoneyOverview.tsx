import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet } from "lucide-react"
import { api } from "@/lib/api"
import { currentMonthString, fmtINR, shiftMonth } from "@/lib/utils"
import { toastError } from "@/lib/toast"
import { MoneyOverviewSkeleton } from "@/components/Skeleton"
import { BudgetBars, CategoryPie, DailyTrend } from "./charts"

export default function MoneyOverview() {
  const [month, setMonth] = useState(currentMonthString())

  const { data, isLoading, error } = useQuery({
    queryKey: ["money", "stats", month],
    queryFn: () => api.money.stats(month),
  })

  if (error) toastError(error, "Couldn't load money stats")
  if (isLoading || !data) return <MoneyOverviewSkeleton />

  const net = data.total_income - data.total_expense
  const niceMonth = new Date(`${month}-01`).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Money</h1>
          <p className="text-sm text-white/40 mt-1">{niceMonth}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => setMonth(currentMonthString())}
            className="px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Income" value={fmtINR(data.total_income)} Icon={TrendingUp} accent="text-emerald-400" />
        <StatCard label="Spent" value={fmtINR(data.total_expense)} Icon={TrendingDown} accent="text-pink-400" />
        <StatCard
          label="Net"
          value={`${net >= 0 ? "+" : ""}${fmtINR(net)}`}
          Icon={Wallet}
          accent={net >= 0 ? "text-emerald-400" : "text-red-400"}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6">
          <h2 className="text-sm font-medium text-white/80 mb-4">By category</h2>
          <CategoryPie by_category={data.by_category} />
        </section>
        <section className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6">
          <h2 className="text-sm font-medium text-white/80 mb-4">Daily trend</h2>
          <DailyTrend daily={data.daily} />
        </section>
      </div>

      <section className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6">
        <h2 className="text-sm font-medium text-white/80 mb-4">Budgets</h2>
        <BudgetBars
          budget={data.budget}
          by_category={data.by_category}
          budget_used_pct={data.budget_used_pct}
        />
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  Icon,
  accent,
}: {
  label: string
  value: string
  Icon: React.ComponentType<{ size?: number }>
  accent: string
}) {
  return (
    <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-5">
      <div className="flex items-center gap-2 text-white/40 text-xs mb-2">
        <Icon size={14} />
        {label}
      </div>
      <div className={`text-2xl font-semibold ${accent}`}>{value}</div>
    </div>
  )
}
