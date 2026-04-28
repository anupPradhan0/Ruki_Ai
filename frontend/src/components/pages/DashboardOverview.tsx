import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Sparkles,
  GraduationCap,
  Briefcase,
  Coffee,
  PiggyBank,
  Target,
  Wallet,
  Calendar,
  TrendingUp,
  Heart,
  Home,
  Users,
} from "lucide-react"
import {
  api,
  session,
  type UserType,
  type DashboardResponse,
  type StudentProfile,
  type EmployedProfile,
  type UnemployedProfile,
  type RetiredProfile,
  type FinancialGoal,
  type CustomCategory,
} from "@/lib/api"

const VALID_TYPES: UserType[] = ["student", "employed", "unemployed", "retired"]

export default function DashboardOverview() {
  const sess = useMemo(() => session.read(), [])
  const userType = sess?.user_type as UserType | undefined

  const dashQuery = useQuery({
    queryKey: ["dashboard", userType],
    queryFn: () => api.getDashboard(userType as UserType),
    enabled: !!userType && VALID_TYPES.includes(userType),
    retry: false,
  })

  if (!dashQuery.data || dashQuery.data.needs_onboarding || !dashQuery.data.quiz_completed) {
    return null
  }

  return <DashboardView data={dashQuery.data} userType={userType as UserType} />
}

// ── View ─────────────────────────────────────────────────────────────────

function DashboardView({ data, userType }: { data: DashboardResponse; userType: UserType }) {
  const currency = data.user?.currency ?? "INR"
  const quizAnswers =
    data.student?.quiz_responses ??
    data.employed?.quiz_responses ??
    data.unemployed?.quiz_responses ??
    data.retired?.quiz_responses

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      {data.ai_advice && <AIAdviceCard text={data.ai_advice} />}

      {userType === "student" && data.student && <StudentSections p={data.student} c={currency} />}
      {userType === "employed" && data.employed && <EmployedSections p={data.employed} c={currency} />}
      {userType === "unemployed" && data.unemployed && <UnemployedSections p={data.unemployed} c={currency} />}
      {userType === "retired" && data.retired && <RetiredSections p={data.retired} c={currency} />}

      {quizAnswers && quizAnswers.length > 0 && <QuizCard answers={quizAnswers} />}
    </div>
  )
}

// ── Reusable cards ────────────────────────────────────────────────────────

function Card({
  title,
  icon: Icon,
  children,
}: {
  title?: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  children: React.ReactNode
}) {
  return (
    <section className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6">
      {title && (
        <div className="flex items-center gap-2 mb-4">
          {Icon && <Icon size={16} className="text-[#FFD700]" />}
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">{title}</h2>
        </div>
      )}
      {children}
    </section>
  )
}

function StatGrid({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  if (items.length === 0) return null
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {items.map((it, i) => (
        <div key={i} className="bg-[#0F0F0F]/60 border border-white/5 rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wide text-white/40 mb-1">{it.label}</div>
          <div className="text-sm text-white font-medium break-words">{it.value || "—"}</div>
        </div>
      ))}
    </div>
  )
}

export function fmtMoney(n: number | undefined | null, c: string): string {
  if (n === undefined || n === null) return "—"
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n)
  } catch {
    return `${c} ${n}`
  }
}

function titleCase(s: string | undefined | null): string {
  if (!s) return "—"
  return s
    .split(/[-_\s]/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ")
}

function AIAdviceCard({ text }: { text: string }) {
  const lines = text.split("\n")
  return (
    <Card title="AI Advice" icon={Sparkles}>
      <div className="space-y-2 text-sm text-white/80 leading-relaxed">
        {lines.map((raw, i) => {
          const line = raw.trim()
          if (!line) return <div key={i} className="h-1" />
          if (line.startsWith("## ")) {
            return (
              <h3 key={i} className="text-[#FFD700] font-semibold text-sm mt-3">
                {line.replace(/^##\s*/, "")}
              </h3>
            )
          }
          if (line.startsWith("• ") || line.startsWith("- ")) {
            return (
              <div key={i} className="flex gap-2">
                <span className="text-[#FFD700] shrink-0">•</span>
                <span>{line.replace(/^[•\-]\s*/, "")}</span>
              </div>
            )
          }
          return <p key={i}>{line}</p>
        })}
      </div>
    </Card>
  )
}

function GoalsCard({ goals, c }: { goals: FinancialGoal[]; c: string }) {
  if (!goals || goals.length === 0) return null
  return (
    <Card title="Financial Goals" icon={Target}>
      <div className="space-y-4">
        {goals.map((g, i) => {
          const target = g.target_amount || 1
          const saved = g.current_amount ?? 0
          const pct = Math.min(100, Math.round((saved / target) * 100))
          return (
            <div key={i}>
              <div className="flex items-baseline justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{g.name}</span>
                  {g.priority && (
                    <span
                      className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
                        g.priority === "high"
                          ? "bg-red-500/10 text-red-400"
                          : g.priority === "medium"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-blue-500/10 text-blue-400"
                      }`}
                    >
                      {g.priority}
                    </span>
                  )}
                </div>
                <span className="text-xs text-white/50">
                  {fmtMoney(saved, c)} / {fmtMoney(target, c)} ({pct}%)
                </span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#FFD700] transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function CategoriesCard({ items, c }: { items: CustomCategory[]; c: string }) {
  if (!items || items.length === 0) return null
  return (
    <Card title="Spending Categories" icon={Wallet}>
      <div className="space-y-3">
        {items.map((cat, i) => {
          const limit = cat.budget_limit || 1
          const spent = cat.actual_spent ?? 0
          const pct = Math.min(100, Math.round((spent / limit) * 100))
          const over = spent > limit
          return (
            <div key={i}>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-sm font-medium">{cat.name}</span>
                <span className={`text-xs ${over ? "text-red-400" : "text-white/50"}`}>
                  {fmtMoney(spent, c)} / {fmtMoney(limit, c)}
                </span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${over ? "bg-red-500" : "bg-[#FFD700]"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function ListCard({
  title,
  icon,
  rows,
  empty = "Nothing recorded yet.",
}: {
  title: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  rows: { label: string; right?: string }[]
  empty?: string
}) {
  return (
    <Card title={title} icon={icon}>
      {rows.length === 0 ? (
        <p className="text-sm text-white/40 italic">{empty}</p>
      ) : (
        <div className="divide-y divide-white/5">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-white/80">{r.label}</span>
              <span className="text-white/60 font-medium">{r.right ?? ""}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function QuizCard({ answers }: { answers: { question: string; answer: string }[] }) {
  return (
    <Card title="Self-Assessment" icon={Sparkles}>
      <div className="space-y-3">
        {answers.map((qa, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-[#FFD700]/10 text-[#FFD700] text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <div className="text-sm">
              <p className="text-white/60">{qa.question}</p>
              <p className="text-white font-medium">{qa.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Student ───────────────────────────────────────────────────────────────

function StudentSections({ p, c }: { p: StudentProfile; c: string }) {
  return (
    <>
      <Card title="Education & Living" icon={GraduationCap}>
        <StatGrid
          items={[
            { label: "Education", value: titleCase(p.education_level) },
            { label: "Institution", value: p.institution_name || "—" },
            { label: "Living", value: titleCase(p.living_situation) },
            { label: "Allowance", value: fmtMoney(p.monthly_allowance, c) },
            { label: "Parent funded", value: titleCase(p.is_parent_funded) },
            { label: "Summary", value: titleCase(p.summary_frequency) },
          ]}
        />
      </Card>

      {p.financial_goals && p.financial_goals.length > 0 && <GoalsCard goals={p.financial_goals} c={c} />}
      {p.custom_categories && p.custom_categories.length > 0 && (
        <CategoriesCard items={p.custom_categories} c={c} />
      )}
    </>
  )
}

// ── Employed ──────────────────────────────────────────────────────────────

function EmployedSections({ p, c }: { p: EmployedProfile; c: string }) {
  return (
    <>
      <Card title="Job" icon={Briefcase}>
        <StatGrid
          items={[
            { label: "Title", value: p.job_title || "—" },
            { label: "Company", value: p.company || "—" },
            { label: "Type", value: titleCase(p.employment_type) },
            { label: "Industry", value: p.work_industry || "—" },
            { label: "Location", value: p.work_location || "—" },
            { label: "Summary", value: titleCase(p.summary_frequency) },
          ]}
        />
      </Card>

      <Card title="Income" icon={TrendingUp}>
        <StatGrid
          items={[
            { label: "Monthly salary", value: fmtMoney(p.monthly_salary, c) },
            { label: "Pay frequency", value: titleCase(p.pay_frequency) },
            { label: "Bonuses", value: p.has_bonuses ? "Yes" : "No" },
            ...(p.bonus_details
              ? [
                  { label: "Bonus amount", value: fmtMoney(p.bonus_details.amount, c) },
                  { label: "Bonus frequency", value: p.bonus_details.frequency || "—" },
                ]
              : []),
          ]}
        />
        {p.additional_income_sources && p.additional_income_sources.length > 0 && (
          <div className="mt-4">
            <ListCard
              title="Additional income sources"
              rows={p.additional_income_sources.map((s) => ({
                label: `${s.name || s.source_type || "Source"} (${titleCase(s.frequency)})`,
                right: fmtMoney(s.amount, c),
              }))}
            />
          </div>
        )}
      </Card>

      <ListCard
        title="Fixed Expenses"
        icon={Wallet}
        rows={(p.fixed_expenses ?? []).map((e) => ({ label: e.category, right: fmtMoney(e.amount, c) }))}
        empty="No fixed expenses recorded."
      />

      <ListCard
        title="Budget Limits"
        icon={Wallet}
        rows={(p.budget_limits ?? []).map((b) => ({
          label: b.category,
          right: `${fmtMoney(b.current_spending ?? 0, c)} / ${fmtMoney(b.limit, c)}`,
        }))}
        empty="No budgets set."
      />

      {p.financial_goals && p.financial_goals.length > 0 && <GoalsCard goals={p.financial_goals} c={c} />}

      {p.investment_preferences && (
        <Card title="Investment Preferences" icon={TrendingUp}>
          <StatGrid
            items={[
              { label: "Risk tolerance", value: titleCase(p.investment_preferences.risk_tolerance) },
              { label: "Experience", value: titleCase(p.investment_preferences.experience_level) },
              {
                label: "Interested in",
                value:
                  (p.investment_preferences.interested_in ?? []).length > 0
                    ? (p.investment_preferences.interested_in ?? []).map(titleCase).join(", ")
                    : "—",
              },
            ]}
          />
        </Card>
      )}
    </>
  )
}

// ── Unemployed ────────────────────────────────────────────────────────────

function UnemployedSections({ p, c }: { p: UnemployedProfile; c: string }) {
  return (
    <>
      <Card title="Status & Living" icon={Coffee}>
        <StatGrid
          items={[
            { label: "Status", value: titleCase(p.employment_status) },
            { label: "Living", value: titleCase(p.living_situation) },
            { label: "Dependents", value: p.has_dependents ? `${p.dependents_count ?? 0}` : "None" },
            { label: "Comfort budget", value: fmtMoney(p.comfort_budget, c) },
            { label: "Runway (days)", value: `${p.runway_estimate ?? 0}` },
            { label: "Goal priority", value: titleCase(p.goal_priority) },
          ]}
        />
      </Card>

      {p.last_job_details && (p.last_job_details.industry || p.last_job_details.position) && (
        <Card title="Last Job" icon={Briefcase}>
          <StatGrid
            items={[
              { label: "Industry", value: p.last_job_details.industry || "—" },
              { label: "Position", value: p.last_job_details.position || "—" },
              { label: "Duration", value: p.last_job_details.duration || "—" },
            ]}
          />
        </Card>
      )}

      <Card title="Income & Savings" icon={Wallet}>
        <StatGrid
          items={[
            { label: "Current income", value: fmtMoney(p.current_income, c) },
            { label: "Total savings", value: fmtMoney(p.savings_details?.amount, c) },
            { label: "Emergency fund", value: fmtMoney(p.savings_details?.emergency_fund, c) },
            { label: "Months covered", value: `${p.savings_details?.months_covered ?? 0}` },
            { label: "Total debt", value: fmtMoney(p.debt?.amount, c) },
            { label: "Monthly payment", value: fmtMoney(p.debt?.monthly_payment, c) },
          ]}
        />
        {p.income_sources && p.income_sources.length > 0 && (
          <div className="mt-4">
            <ListCard
              title="Income sources"
              rows={p.income_sources.map((s) => ({
                label: `${s.name || s.source_type || "Source"} (${titleCase(s.frequency)})`,
                right: fmtMoney(s.amount, c),
              }))}
            />
          </div>
        )}
      </Card>

      <ListCard
        title="Regular Expenses"
        icon={Wallet}
        rows={(p.regular_expenses ?? []).map((e) => ({
          label: `${e.category}${e.essential ? "" : " (non-essential)"}`,
          right: `${fmtMoney(e.amount, c)} · ${titleCase(e.frequency)}`,
        }))}
        empty="No regular expenses recorded."
      />

      <ListCard
        title="Budget Limits"
        icon={Wallet}
        rows={(p.budget_limits ?? []).map((b) => ({ label: b.category, right: fmtMoney(b.limit, c) }))}
        empty="No budgets set."
      />

      {p.financial_goals && p.financial_goals.length > 0 && <GoalsCard goals={p.financial_goals} c={c} />}

      {p.job_search_details && (
        <Card title="Job Search" icon={Briefcase}>
          <StatGrid
            items={[
              { label: "Active", value: p.job_search_details.active ? "Yes" : "No" },
              { label: "Apps / week", value: `${p.job_search_details.applications_per_week ?? 0}` },
              { label: "Search budget", value: fmtMoney(p.job_search_details.job_search_budget, c) },
              { label: "Gig interest", value: titleCase(p.gig_interest) },
              { label: "Has tools", value: p.has_tools ? "Yes" : "No" },
              { label: "Relocate", value: p.willing_to_relocate ? "Yes" : "No" },
              { label: "Industries", value: (p.job_search_details.industries_targeted ?? []).join(", ") || "—" },
              { label: "Skills", value: (p.job_search_details.skills_development ?? []).join(", ") || "—" },
            ]}
          />
        </Card>
      )}

      {p.support_resources && (
        <Card title="Support Wanted" icon={Heart}>
          <StatGrid
            items={[
              { label: "Budget help", value: p.support_resources.wants_budget_help ? "Yes" : "No" },
              { label: "Job resources", value: p.support_resources.wants_job_resources ? "Yes" : "No" },
              { label: "Debt advice", value: p.support_resources.wants_debt_advice ? "Yes" : "No" },
            ]}
          />
        </Card>
      )}
    </>
  )
}

// ── Retired ───────────────────────────────────────────────────────────────

function RetiredSections({ p, c }: { p: RetiredProfile; c: string }) {
  return (
    <>
      {p.pension && (
        <Card title="Pension" icon={Calendar}>
          <StatGrid
            items={[
              { label: "Receives", value: p.pension.receives ? "Yes" : "No" },
              { label: "Amount", value: fmtMoney(p.pension.amount, c) },
              { label: "Frequency", value: titleCase(p.pension.frequency) },
            ]}
          />
        </Card>
      )}

      {p.other_income_sources && p.other_income_sources.length > 0 && (
        <ListCard
          title="Other Income"
          icon={TrendingUp}
          rows={p.other_income_sources.map((s) => ({
            label: `${s.name || s.source_type || "Source"} (${titleCase(s.frequency)})`,
            right: fmtMoney(s.amount, c),
          }))}
        />
      )}

      {p.retirement_account_withdrawals && p.retirement_account_withdrawals.length > 0 && (
        <ListCard
          title="Account Withdrawals"
          icon={TrendingUp}
          rows={p.retirement_account_withdrawals.map((w) => ({
            label: w.type,
            right: `${fmtMoney(w.monthly_amount, c)} / mo`,
          }))}
        />
      )}

      {p.housing && (
        <Card title="Housing" icon={Home}>
          <StatGrid
            items={[
              { label: "Rent / mortgage", value: fmtMoney(p.housing.mortgage_or_rent, c) },
              { label: "Insurance", value: fmtMoney(p.housing.insurance, c) },
              { label: "Maintenance", value: fmtMoney(p.housing.maintenance, c) },
            ]}
          />
        </Card>
      )}

      {p.healthcare && (
        <Card title="Healthcare" icon={Heart}>
          <StatGrid
            items={[
              { label: "Premium", value: fmtMoney(p.healthcare.monthly_premium, c) },
              { label: "Out of pocket", value: fmtMoney(p.healthcare.out_of_pocket, c) },
            ]}
          />
        </Card>
      )}

      {p.other_expenses && p.other_expenses.length > 0 && (
        <ListCard
          title="Other Expenses"
          icon={Wallet}
          rows={p.other_expenses.map((e) => ({
            label: `${e.name} (${titleCase(e.frequency)})`,
            right: fmtMoney(e.amount, c),
          }))}
        />
      )}

      {p.retirement_accounts && p.retirement_accounts.length > 0 && (
        <ListCard
          title="Retirement Accounts"
          icon={PiggyBank}
          rows={p.retirement_accounts.map((a) => ({ label: a.type, right: fmtMoney(a.current_value, c) }))}
        />
      )}

      {p.other_assets && p.other_assets.length > 0 && (
        <ListCard
          title="Other Assets"
          icon={PiggyBank}
          rows={p.other_assets.map((a) => ({ label: a.type, right: fmtMoney(a.estimated_value, c) }))}
        />
      )}

      {p.savings_goals && p.savings_goals.length > 0 && (
        <Card title="Savings Goals" icon={Target}>
          <div className="space-y-4">
            {p.savings_goals.map((g, i) => {
              const target = g.target_amount || 1
              const saved = g.current_amount ?? 0
              const pct = Math.min(100, Math.round((saved / target) * 100))
              return (
                <div key={i}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="font-medium text-sm">
                      {g.name}
                      {g.category && <span className="text-white/40 ml-2 text-xs">{g.category}</span>}
                    </span>
                    <span className="text-xs text-white/50">
                      {fmtMoney(saved, c)} / {fmtMoney(target, c)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#FFD700] transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {p.legacy_planning && p.legacy_planning.beneficiaries && p.legacy_planning.beneficiaries.length > 0 && (
        <ListCard
          title="Beneficiaries"
          icon={Users}
          rows={p.legacy_planning.beneficiaries.map((b) => ({
            label: `${b.name}${b.relationship ? ` · ${b.relationship}` : ""}`,
            right: `${b.percentage}%`,
          }))}
        />
      )}
    </>
  )
}
