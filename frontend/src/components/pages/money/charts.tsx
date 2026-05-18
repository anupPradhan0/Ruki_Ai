import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts"
import type { Category, DailyPoint, StatsResponse } from "@/lib/api"
import { fmtINR } from "@/lib/utils"

const PIE_COLORS = [
  "#FFD700", "#FF7AB6", "#7AC1FF", "#9CFF7A", "#FF9966",
  "#C77AFF", "#FFE66D", "#7AFFD4", "#FF7A7A", "#A0A0A0",
  "#5FB3FF", "#D4A574",
]

const TOOLTIP_STYLE = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: 8,
} as const

interface CategoryPieProps {
  by_category: StatsResponse["by_category"]
}

export function CategoryPie({ by_category }: CategoryPieProps) {
  const data = Object.entries(by_category)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([name, value]) => ({ name, value: value as number }))

  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-white/40 text-sm">
        No spending this month
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={50}
          outerRadius={85}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => fmtINR(Number(v))}
          contentStyle={TOOLTIP_STYLE}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#aaa" }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function DailyTrend({ daily }: { daily: DailyPoint[] }) {
  if (daily.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-white/40 text-sm">
        No data yet
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={daily}>
        <CartesianGrid stroke="#222" strokeDasharray="3 3" />
        <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 11 }} />
        <YAxis stroke="#666" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
        <Tooltip
          formatter={(v) => fmtINR(Number(v))}
          contentStyle={TOOLTIP_STYLE}
        />
        <Line type="monotone" dataKey="expense" stroke="#FF7AB6" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="income" stroke="#7AC1FF" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface BudgetBarsProps {
  budget: StatsResponse["budget"]
  by_category: StatsResponse["by_category"]
  budget_used_pct: StatsResponse["budget_used_pct"]
}

export function BudgetBars({ budget, by_category, budget_used_pct }: BudgetBarsProps) {
  const entries = budget ? Object.entries(budget) : []
  if (entries.length === 0) {
    return (
      <p className="text-sm text-white/40">
        No budgets set. Head to the Budget tab to add limits per category.
      </p>
    )
  }
  return (
    <div className="space-y-3">
      {entries.map(([cat, limit]) => {
        const spent = by_category[cat as Category] ?? 0
        const pct = budget_used_pct?.[cat as Category] ?? 0
        const overBudget = pct >= 100
        const warn = pct >= 80 && !overBudget
        return (
          <div key={cat}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="capitalize text-white/80">{cat.replace("_", " ")}</span>
              <span className={overBudget ? "text-red-400" : warn ? "text-yellow-400" : "text-white/60"}>
                {fmtINR(spent)} / {fmtINR(limit as number)} · {pct.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  overBudget ? "bg-red-500" : warn ? "bg-yellow-400" : "bg-[#FFD700]"
                }`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
