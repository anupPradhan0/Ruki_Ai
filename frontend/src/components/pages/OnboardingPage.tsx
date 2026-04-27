import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import {
  AlertCircle,
  GraduationCap,
  Briefcase,
  Coffee,
  PiggyBank,
  Loader2,
  Plus,
  X,
} from "lucide-react"
import {
  api,
  session,
  type UserType,
  type StudentForm,
  type EmployedForm,
  type UnemployedForm,
  type RetiredForm,
  type FinancialGoal,
  type CustomCategory,
  type IncomeSource,
  type FixedExpense,
  type BudgetLimit,
  type RegularExpense,
  type Beneficiary,
  type RetirementAccount,
  type RetirementAccountWithdrawal,
  type OtherAsset,
  type OtherExpense,
  type SavingsGoal,
  type Priority,
  type PayFrequency,
  type SummaryFrequency as SF,
} from "@/lib/api"

// ── Shared primitives ─────────────────────────────────────────────────────

const inputCls =
  "w-full bg-[#0F0F0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FFD700]/50 transition-colors"
const labelCls = "block text-sm font-medium mb-2 text-white/80"
const sectionCls = "border-t border-white/5 pt-6"
const sectionTitleCls = "text-sm font-semibold text-white/90 mb-1"
const sectionHintCls = "text-xs text-white/40 mb-4"

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className={sectionCls}>
      <h3 className={sectionTitleCls}>{title}</h3>
      {hint && <p className={sectionHintCls}>{hint}</p>}
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3.5 bg-[#FFD700] text-black font-semibold rounded-xl hover:bg-[#e6c200] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {pending && <Loader2 size={16} className="animate-spin" />}
      {pending ? "Saving..." : "Continue to quick quiz"}
    </button>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string
  value: string | undefined
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        className={inputCls}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  min = 0,
}: {
  label: string
  value: number | undefined
  onChange: (n: number) => void
  placeholder?: string
  min?: number
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type="number"
        min={min}
        className={inputCls}
        value={Number.isFinite(value as number) ? (value as number) : 0}
        placeholder={placeholder}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  )
}

function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T | undefined
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <select
        className={inputCls}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value as T)}
      >
        <option value="" disabled className="bg-[#0F0F0F]">
          Select...
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0F0F0F]">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (b: boolean) => void
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex gap-2">
        {[
          { v: true, l: "Yes" },
          { v: false, l: "No" },
        ].map((opt) => (
          <button
            key={opt.l}
            type="button"
            onClick={() => onChange(opt.v)}
            className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all ${
              value === opt.v
                ? "bg-[#FFD700] text-black border-[#FFD700]"
                : "border-white/10 text-white/60 hover:border-[#FFD700]/40 hover:text-white"
            }`}
          >
            {opt.l}
          </button>
        ))}
      </div>
    </div>
  )
}

function Chips({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
  options: { value: string; label: string }[]
}) {
  const toggle = (v: string) =>
    value.includes(v) ? onChange(value.filter((x) => x !== v)) : onChange([...value, v])

  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                active
                  ? "bg-[#FFD700] text-black border-[#FFD700]"
                  : "border-white/10 text-white/60 hover:border-[#FFD700]/40 hover:text-white"
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ListField<T>({
  title,
  hint,
  items,
  onChange,
  newItem,
  renderRow,
  addLabel = "Add",
}: {
  title: string
  hint?: string
  items: T[]
  onChange: (next: T[]) => void
  newItem: () => T
  renderRow: (item: T, update: (patch: Partial<T>) => void, idx: number) => React.ReactNode
  addLabel?: string
}) {
  const update = (idx: number, patch: Partial<T>) => {
    const next = [...items]
    next[idx] = { ...next[idx], ...patch }
    onChange(next)
  }
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx))

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className={labelCls + " mb-0"}>{title}</label>
        <button
          type="button"
          onClick={() => onChange([...items, newItem()])}
          className="flex items-center gap-1 text-xs text-[#FFD700] hover:underline"
        >
          <Plus size={14} /> {addLabel}
        </button>
      </div>
      {hint && <p className={sectionHintCls}>{hint}</p>}
      {items.length === 0 ? (
        <p className="text-xs text-white/30 italic">None added yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div
              key={idx}
              className="relative border border-white/10 rounded-xl p-4 bg-[#0F0F0F]/60"
            >
              <button
                type="button"
                onClick={() => remove(idx)}
                className="absolute top-3 right-3 text-white/30 hover:text-red-400"
                aria-label="Remove"
              >
                <X size={16} />
              </button>
              <div className="pr-6">{renderRow(it, (patch) => update(idx, patch), idx)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Option lists ──────────────────────────────────────────────────────────

const summaryOptions: { value: SF; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "never", label: "Never" },
]

const payFrequencyOptions: { value: PayFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-weekly" },
  { value: "semi-monthly", label: "Semi-monthly" },
  { value: "monthly", label: "Monthly" },
  { value: "annually", label: "Annually" },
]

const priorityOptions: { value: Priority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
]

const investmentInterests = [
  { value: "stocks", label: "Stocks" },
  { value: "mutual-funds", label: "Mutual funds" },
  { value: "bonds", label: "Bonds" },
  { value: "real-estate", label: "Real estate" },
  { value: "crypto", label: "Crypto" },
  { value: "gold", label: "Gold" },
  { value: "fixed-deposits", label: "Fixed deposits" },
]

// ── Cleaners (drop incomplete rows so backend validators pass) ────────────

const cleanGoals = (gs: FinancialGoal[]) =>
  gs
    .filter((g) => g.name.trim() !== "" && g.target_amount > 0)
    .map((g) => ({
      ...g,
      name: g.name.trim(),
      current_amount: g.current_amount ?? 0,
      priority: g.priority ?? "medium",
    }))

const cleanCategories = (cs: CustomCategory[]) =>
  cs
    .filter((c) => c.name.trim() !== "" && c.budget_limit >= 0)
    .map((c) => ({ ...c, name: c.name.trim(), actual_spent: c.actual_spent ?? 0 }))

const cleanIncomeSources = (xs: IncomeSource[]) =>
  xs.filter((x) => x.amount > 0).map((x) => ({ ...x, frequency: x.frequency ?? "monthly" }))

const cleanFixed = (xs: FixedExpense[]) =>
  xs.filter((x) => x.category.trim() !== "" && x.amount >= 0).map((x) => ({ ...x, category: x.category.trim() }))

const cleanRegular = (xs: RegularExpense[]) =>
  xs
    .filter((x) => x.category.trim() !== "" && x.amount >= 0)
    .map((x) => ({
      ...x,
      category: x.category.trim(),
      frequency: x.frequency ?? "monthly",
      essential: x.essential ?? true,
    }))

const cleanBudgets = (xs: BudgetLimit[]) =>
  xs
    .filter((x) => x.category.trim() !== "" && x.limit >= 0)
    .map((x) => ({ ...x, category: x.category.trim(), current_spending: x.current_spending ?? 0 }))

// ── Main page ─────────────────────────────────────────────────────────────

const VALID_TYPES: UserType[] = ["student", "employed", "unemployed", "retired"]

const typeMeta: Record<UserType, { label: string; tagline: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  student: { label: "Student", tagline: "School, college, or university", icon: GraduationCap },
  employed: { label: "Employed", tagline: "Salary, freelance, or self-employed", icon: Briefcase },
  unemployed: { label: "Unemployed", tagline: "Between jobs or taking a break", icon: Coffee },
  retired: { label: "Retired", tagline: "Pension and savings life", icon: PiggyBank },
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const sess = useMemo(() => session.read(), [])
  const initialType = sess?.user_type && VALID_TYPES.includes(sess.user_type as UserType)
    ? (sess.user_type as UserType)
    : ""
  const [userType, setUserType] = useState<UserType | "">(initialType)

  useEffect(() => {
    if (!sess?.user_id) navigate({ to: "/signup" })
  }, [sess, navigate])

  if (!sess?.user_id) return null

  // No type from signup — let them pick once, then swap to the form.
  if (!userType) {
    return (
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">First, who are you?</h1>
            <p className="text-white/50 text-sm">Pick the one that fits you best.</p>
          </div>

          <div className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {VALID_TYPES.map((value) => {
                const t = typeMeta[value]
                const Icon = t.icon
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setUserType(value)
                      session.setUserType(value)
                    }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10 text-white/60 text-center hover:border-[#FFD700]/40 hover:text-white transition-all"
                  >
                    <Icon size={22} />
                    <span className="text-sm font-medium">{t.label}</span>
                    <span className="text-[11px] text-white/40 leading-tight">{t.tagline}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Type known — render only their form.
  const meta = typeMeta[userType]
  const Icon = meta.icon

  return (
    <div className="flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-[#FFD700]/80 mb-3">
            <Icon size={14} />
            <span>{meta.label}</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Tell us about yourself</h1>
          <p className="text-white/50 text-sm">
            The more we know, the better the AI advice we can give you.
          </p>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-8 space-y-6">
          {userType === "student" && <StudentFormView userId={sess.user_id} />}
          {userType === "employed" && <EmployedFormView userId={sess.user_id} />}
          {userType === "unemployed" && <UnemployedFormView userId={sess.user_id} />}
          {userType === "retired" && <RetiredFormView userId={sess.user_id} />}
        </div>
      </div>
    </div>
  )
}

// ── Student ───────────────────────────────────────────────────────────────

function StudentFormView({ userId }: { userId: string }) {
  const navigate = useNavigate()
  const [form, setForm] = useState<StudentForm>({
    user_id: userId,
    education_level: "college",
    institution_name: "",
    living_situation: "hostel",
    monthly_allowance: 0,
    is_parent_funded: "yes",
    custom_categories: [],
    financial_goals: [],
    summary_frequency: "weekly",
  })

  const set = <K extends keyof StudentForm>(k: K, v: StudentForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: () =>
      api.submitStudent({
        ...form,
        custom_categories: cleanCategories(form.custom_categories ?? []),
        financial_goals: cleanGoals(form.financial_goals ?? []),
      }),
    onSuccess: () => navigate({ to: "/quiz" }),
  })

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      {mutation.isError && <ErrorBox message={(mutation.error as Error).message} />}

      <Section title="Education" hint="What stage of school are you in?">
        <Select
          label="Education level"
          value={form.education_level}
          onChange={(v) => set("education_level", v)}
          options={[
            { value: "school", label: "School" },
            { value: "college", label: "College" },
            { value: "university", label: "University" },
            { value: "other", label: "Other" },
          ]}
        />
        <TextField
          label="Institution name"
          value={form.institution_name}
          onChange={(v) => set("institution_name", v)}
          placeholder="Mumbai University"
        />
      </Section>

      <Section title="Living & funding" hint="How are you supported month-to-month?">
        <Select
          label="Living situation"
          value={form.living_situation}
          onChange={(v) => set("living_situation", v)}
          options={[
            { value: "hostel", label: "Hostel" },
            { value: "family", label: "With family" },
            { value: "rental", label: "Rental" },
            { value: "pg", label: "PG" },
            { value: "other", label: "Other" },
          ]}
        />
        <NumberField
          label="Monthly allowance / income"
          value={form.monthly_allowance}
          onChange={(n) => set("monthly_allowance", n)}
          placeholder="5000"
        />
        <Select
          label="Funded by parents?"
          value={form.is_parent_funded}
          onChange={(v) => set("is_parent_funded", v)}
          options={[
            { value: "yes", label: "Yes" },
            { value: "partially", label: "Partially" },
            { value: "no", label: "No" },
          ]}
        />
      </Section>

      <Section
        title="Spending categories"
        hint="What buckets do you usually budget for? (e.g. Food, Books, Transport)"
      >
        <ListField<CustomCategory>
          title="Custom categories"
          items={form.custom_categories ?? []}
          onChange={(v) => set("custom_categories", v)}
          newItem={() => ({ name: "", budget_limit: 0, actual_spent: 0 })}
          addLabel="Add category"
          renderRow={(it, update) => (
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Name" value={it.name} onChange={(v) => update({ name: v })} placeholder="Food" />
              <NumberField label="Budget limit" value={it.budget_limit} onChange={(v) => update({ budget_limit: v })} />
            </div>
          )}
        />
      </Section>

      <Section
        title="Financial goals"
        hint="What are you saving up for? Add as many as you like."
      >
        <ListField<FinancialGoal>
          title="Goals"
          items={form.financial_goals ?? []}
          onChange={(v) => set("financial_goals", v)}
          newItem={() => ({ name: "", target_amount: 0, current_amount: 0, priority: "medium" })}
          addLabel="Add goal"
          renderRow={(it, update) => (
            <div className="space-y-3">
              <TextField
                label="Goal"
                value={it.name}
                onChange={(v) => update({ name: v })}
                placeholder="New laptop"
              />
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Target amount"
                  value={it.target_amount}
                  onChange={(v) => update({ target_amount: v })}
                />
                <NumberField
                  label="Saved so far"
                  value={it.current_amount}
                  onChange={(v) => update({ current_amount: v })}
                />
              </div>
              <Select<Priority>
                label="Priority"
                value={it.priority}
                onChange={(v) => update({ priority: v })}
                options={priorityOptions}
              />
            </div>
          )}
        />
      </Section>

      <Section title="Preferences">
        <Select<SF>
          label="How often should we summarize your spending?"
          value={form.summary_frequency}
          onChange={(v) => set("summary_frequency", v)}
          options={summaryOptions}
        />
      </Section>

      <SubmitButton pending={mutation.isPending} />
    </form>
  )
}

// ── Employed ──────────────────────────────────────────────────────────────

function EmployedFormView({ userId }: { userId: string }) {
  const navigate = useNavigate()
  const [form, setForm] = useState<EmployedForm>({
    user_id: userId,
    job_title: "",
    employment_type: "full-time",
    company: "",
    work_industry: "",
    work_location: "",
    monthly_salary: 0,
    pay_frequency: "monthly",
    additional_income_sources: [],
    has_bonuses: false,
    bonus_details: null,
    fixed_expenses: [],
    budget_limits: [],
    financial_goals: [],
    summary_frequency: "monthly",
    investment_preferences: {
      risk_tolerance: "medium",
      interested_in: [],
      experience_level: "beginner",
    },
  })

  const set = <K extends keyof EmployedForm>(k: K, v: EmployedForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: () => {
      const investment = form.investment_preferences
      return api.submitEmployed({
        ...form,
        additional_income_sources: cleanIncomeSources(form.additional_income_sources ?? []),
        fixed_expenses: cleanFixed(form.fixed_expenses ?? []),
        budget_limits: cleanBudgets(form.budget_limits ?? []),
        financial_goals: cleanGoals(form.financial_goals ?? []),
        bonus_details: form.has_bonuses && form.bonus_details ? form.bonus_details : null,
        investment_preferences:
          investment && (investment.interested_in?.length || investment.risk_tolerance || investment.experience_level)
            ? investment
            : null,
      })
    },
    onSuccess: () => navigate({ to: "/quiz" }),
  })

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      {mutation.isError && <ErrorBox message={(mutation.error as Error).message} />}

      <Section title="Job details">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Job title" value={form.job_title} onChange={(v) => set("job_title", v)} placeholder="Software Engineer" />
          <TextField label="Company" value={form.company} onChange={(v) => set("company", v)} placeholder="Acme Inc" />
        </div>
        <Select
          label="Employment type"
          value={form.employment_type}
          onChange={(v) => set("employment_type", v)}
          options={[
            { value: "full-time", label: "Full-time" },
            { value: "part-time", label: "Part-time" },
            { value: "contract", label: "Contract" },
            { value: "freelance", label: "Freelance" },
            { value: "self-employed", label: "Self-employed" },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Industry" value={form.work_industry} onChange={(v) => set("work_industry", v)} placeholder="Tech / Finance..." />
          <TextField label="Work location" value={form.work_location} onChange={(v) => set("work_location", v)} placeholder="Bengaluru / Remote" />
        </div>
      </Section>

      <Section title="Income">
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Monthly salary" value={form.monthly_salary} onChange={(v) => set("monthly_salary", v)} placeholder="80000" />
          <Select<PayFrequency>
            label="Pay frequency"
            value={form.pay_frequency}
            onChange={(v) => set("pay_frequency", v)}
            options={payFrequencyOptions}
          />
        </div>

        <ListField<IncomeSource>
          title="Other income sources"
          hint="Side gigs, rental income, dividends..."
          items={form.additional_income_sources ?? []}
          onChange={(v) => set("additional_income_sources", v)}
          newItem={() => ({ name: "", source_type: "", amount: 0, frequency: "monthly" })}
          addLabel="Add income"
          renderRow={(it, update) => (
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Name" value={it.name} onChange={(v) => update({ name: v })} placeholder="Side project" />
              <TextField label="Type" value={it.source_type} onChange={(v) => update({ source_type: v })} placeholder="freelance" />
              <NumberField label="Amount" value={it.amount} onChange={(v) => update({ amount: v })} />
              <Select<PayFrequency>
                label="Frequency"
                value={it.frequency}
                onChange={(v) => update({ frequency: v })}
                options={payFrequencyOptions}
              />
            </div>
          )}
        />

        <Toggle
          label="Do you receive bonuses?"
          value={form.has_bonuses ?? false}
          onChange={(b) =>
            setForm((f) => ({
              ...f,
              has_bonuses: b,
              bonus_details: b ? f.bonus_details ?? { amount: 0, frequency: "yearly" } : null,
            }))
          }
        />

        {form.has_bonuses && (
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Typical bonus amount"
              value={form.bonus_details?.amount}
              onChange={(v) =>
                set("bonus_details", { ...(form.bonus_details ?? { amount: 0 }), amount: v })
              }
            />
            <TextField
              label="Bonus frequency"
              value={form.bonus_details?.frequency}
              onChange={(v) =>
                set("bonus_details", { ...(form.bonus_details ?? { amount: 0 }), frequency: v })
              }
              placeholder="yearly / quarterly"
            />
          </div>
        )}
      </Section>

      <Section title="Fixed monthly expenses" hint="Rent, EMIs, subscriptions, utilities.">
        <ListField<FixedExpense>
          title="Fixed expenses"
          items={form.fixed_expenses ?? []}
          onChange={(v) => set("fixed_expenses", v)}
          newItem={() => ({ category: "", amount: 0 })}
          addLabel="Add expense"
          renderRow={(it, update) => (
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Category" value={it.category} onChange={(v) => update({ category: v })} placeholder="Rent" />
              <NumberField label="Amount" value={it.amount} onChange={(v) => update({ amount: v })} />
            </div>
          )}
        />
      </Section>

      <Section title="Budget limits" hint="Monthly cap per spending category.">
        <ListField<BudgetLimit>
          title="Limits"
          items={form.budget_limits ?? []}
          onChange={(v) => set("budget_limits", v)}
          newItem={() => ({ category: "", limit: 0, current_spending: 0 })}
          addLabel="Add limit"
          renderRow={(it, update) => (
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Category" value={it.category} onChange={(v) => update({ category: v })} placeholder="Eating out" />
              <NumberField label="Limit" value={it.limit} onChange={(v) => update({ limit: v })} />
            </div>
          )}
        />
      </Section>

      <Section title="Financial goals">
        <ListField<FinancialGoal>
          title="Goals"
          items={form.financial_goals ?? []}
          onChange={(v) => set("financial_goals", v)}
          newItem={() => ({ name: "", target_amount: 0, current_amount: 0, priority: "medium" })}
          addLabel="Add goal"
          renderRow={(it, update) => (
            <div className="space-y-3">
              <TextField label="Goal" value={it.name} onChange={(v) => update({ name: v })} placeholder="House down payment" />
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Target" value={it.target_amount} onChange={(v) => update({ target_amount: v })} />
                <NumberField label="Saved so far" value={it.current_amount} onChange={(v) => update({ current_amount: v })} />
              </div>
              <Select<Priority>
                label="Priority"
                value={it.priority}
                onChange={(v) => update({ priority: v })}
                options={priorityOptions}
              />
            </div>
          )}
        />
      </Section>

      <Section title="Investment preferences" hint="Even rough preferences help us tailor advice.">
        <Select
          label="Risk tolerance"
          value={form.investment_preferences?.risk_tolerance}
          onChange={(v) =>
            set("investment_preferences", { ...(form.investment_preferences ?? {}), risk_tolerance: v })
          }
          options={[
            { value: "low", label: "Low — protect capital" },
            { value: "medium", label: "Medium — balanced" },
            { value: "high", label: "High — chase growth" },
          ]}
        />
        <Select
          label="Experience level"
          value={form.investment_preferences?.experience_level}
          onChange={(v) =>
            set("investment_preferences", { ...(form.investment_preferences ?? {}), experience_level: v })
          }
          options={[
            { value: "beginner", label: "Beginner" },
            { value: "intermediate", label: "Intermediate" },
            { value: "expert", label: "Expert" },
          ]}
        />
        <Chips
          label="Interested in"
          value={form.investment_preferences?.interested_in ?? []}
          onChange={(v) =>
            set("investment_preferences", { ...(form.investment_preferences ?? {}), interested_in: v })
          }
          options={investmentInterests}
        />
      </Section>

      <Section title="Preferences">
        <Select<SF>
          label="How often should we summarize your spending?"
          value={form.summary_frequency}
          onChange={(v) => set("summary_frequency", v)}
          options={summaryOptions}
        />
      </Section>

      <SubmitButton pending={mutation.isPending} />
    </form>
  )
}

// ── Unemployed ────────────────────────────────────────────────────────────

function UnemployedFormView({ userId }: { userId: string }) {
  const navigate = useNavigate()
  const [form, setForm] = useState<UnemployedForm>({
    user_id: userId,
    employment_status: "actively-seeking",
    last_job_details: { industry: "", position: "", duration: "" },
    current_income: 0,
    income_sources: [],
    debt: { amount: 0, monthly_payment: 0, type: "" },
    comfort_budget: 0,
    runway_estimate: 0,
    living_situation: "with-family",
    has_dependents: false,
    dependents_count: 0,
    gig_interest: "somewhat",
    has_tools: true,
    willing_to_relocate: false,
    goal_priority: "build-emergency-fund",
    savings_details: { amount: 0, emergency_fund: 0, months_covered: 0 },
    regular_expenses: [],
    budget_limits: [],
    financial_goals: [],
    job_search_details: {
      active: true,
      applications_per_week: 0,
      job_search_budget: 0,
      industries_targeted: [],
      skills_development: [],
    },
    summary_frequency: "weekly",
    support_resources: {
      wants_budget_help: false,
      wants_job_resources: false,
      wants_debt_advice: false,
    },
  })

  const set = <K extends keyof UnemployedForm>(k: K, v: UnemployedForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: () => {
      const job = form.job_search_details
      const cleanedJob = job
        ? {
            ...job,
            industries_targeted:
              typeof (job.industries_targeted as unknown) === "string"
                ? (job.industries_targeted as unknown as string)
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                : (job.industries_targeted ?? []),
            skills_development:
              typeof (job.skills_development as unknown) === "string"
                ? (job.skills_development as unknown as string)
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                : (job.skills_development ?? []),
          }
        : null

      return api.submitUnemployed({
        ...form,
        income_sources: cleanIncomeSources(form.income_sources ?? []),
        regular_expenses: cleanRegular(form.regular_expenses ?? []),
        budget_limits: cleanBudgets(form.budget_limits ?? []),
        financial_goals: cleanGoals(form.financial_goals ?? []),
        job_search_details: cleanedJob,
      })
    },
    onSuccess: () => navigate({ to: "/quiz" }),
  })

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      {mutation.isError && <ErrorBox message={(mutation.error as Error).message} />}

      <Section title="Current status">
        <Select
          label="What best describes you right now?"
          value={form.employment_status}
          onChange={(v) => set("employment_status", v)}
          options={[
            { value: "actively-seeking", label: "Actively seeking" },
            { value: "taking-break", label: "Taking a break" },
            { value: "studying", label: "Studying" },
            { value: "caring", label: "Caregiving" },
            { value: "disabled", label: "Disabled" },
          ]}
        />
      </Section>

      <Section title="Last job" hint="Helps us understand your background.">
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Industry"
            value={form.last_job_details?.industry}
            onChange={(v) => set("last_job_details", { ...(form.last_job_details ?? {}), industry: v })}
            placeholder="Tech"
          />
          <TextField
            label="Position"
            value={form.last_job_details?.position}
            onChange={(v) => set("last_job_details", { ...(form.last_job_details ?? {}), position: v })}
            placeholder="Sales Manager"
          />
        </div>
        <TextField
          label="How long were you there?"
          value={form.last_job_details?.duration}
          onChange={(v) => set("last_job_details", { ...(form.last_job_details ?? {}), duration: v })}
          placeholder="3 years"
        />
      </Section>

      <Section title="Income & savings">
        <NumberField
          label="Current income (any source)"
          value={form.current_income}
          onChange={(v) => set("current_income", v)}
        />
        <ListField<IncomeSource>
          title="Income sources"
          hint="Severance, gig pay, rental, family support..."
          items={form.income_sources ?? []}
          onChange={(v) => set("income_sources", v)}
          newItem={() => ({ name: "", source_type: "", amount: 0, frequency: "monthly" })}
          addLabel="Add source"
          renderRow={(it, update) => (
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Name" value={it.name} onChange={(v) => update({ name: v })} placeholder="Severance" />
              <TextField label="Type" value={it.source_type} onChange={(v) => update({ source_type: v })} placeholder="lump-sum" />
              <NumberField label="Amount" value={it.amount} onChange={(v) => update({ amount: v })} />
              <Select<PayFrequency>
                label="Frequency"
                value={it.frequency}
                onChange={(v) => update({ frequency: v })}
                options={payFrequencyOptions}
              />
            </div>
          )}
        />

        <div className="grid grid-cols-3 gap-3">
          <NumberField
            label="Total savings"
            value={form.savings_details?.amount}
            onChange={(v) => set("savings_details", { ...(form.savings_details ?? {}), amount: v })}
          />
          <NumberField
            label="Emergency fund"
            value={form.savings_details?.emergency_fund}
            onChange={(v) => set("savings_details", { ...(form.savings_details ?? {}), emergency_fund: v })}
          />
          <NumberField
            label="Months covered"
            value={form.savings_details?.months_covered}
            onChange={(v) => set("savings_details", { ...(form.savings_details ?? {}), months_covered: v })}
          />
        </div>
      </Section>

      <Section title="Debt">
        <div className="grid grid-cols-3 gap-3">
          <NumberField
            label="Total debt"
            value={form.debt?.amount}
            onChange={(v) => set("debt", { ...(form.debt ?? {}), amount: v })}
          />
          <NumberField
            label="Monthly payment"
            value={form.debt?.monthly_payment}
            onChange={(v) => set("debt", { ...(form.debt ?? {}), monthly_payment: v })}
          />
          <TextField
            label="Type"
            value={form.debt?.type}
            onChange={(v) => set("debt", { ...(form.debt ?? {}), type: v })}
            placeholder="credit card / student loan"
          />
        </div>
      </Section>

      <Section title="Living situation">
        <Select
          label="Where do you live?"
          value={form.living_situation}
          onChange={(v) => set("living_situation", v)}
          options={[
            { value: "alone", label: "Alone" },
            { value: "with-family", label: "With family" },
            { value: "with-roommates", label: "With roommates" },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Toggle
            label="Have dependents?"
            value={form.has_dependents ?? false}
            onChange={(b) => set("has_dependents", b)}
          />
          {form.has_dependents && (
            <NumberField
              label="How many?"
              value={form.dependents_count}
              onChange={(v) => set("dependents_count", v)}
            />
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Comfort budget / month"
            value={form.comfort_budget}
            onChange={(v) => set("comfort_budget", v)}
            placeholder="15000"
          />
          <NumberField
            label="Savings runway (days)"
            value={form.runway_estimate}
            onChange={(v) => set("runway_estimate", v)}
            placeholder="90"
          />
        </div>
      </Section>

      <Section title="Regular expenses">
        <ListField<RegularExpense>
          title="Recurring costs"
          items={form.regular_expenses ?? []}
          onChange={(v) => set("regular_expenses", v)}
          newItem={() => ({ category: "", amount: 0, frequency: "monthly", essential: true })}
          addLabel="Add expense"
          renderRow={(it, update) => (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Category" value={it.category} onChange={(v) => update({ category: v })} placeholder="Groceries" />
                <NumberField label="Amount" value={it.amount} onChange={(v) => update({ amount: v })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select<PayFrequency>
                  label="Frequency"
                  value={it.frequency}
                  onChange={(v) => update({ frequency: v })}
                  options={payFrequencyOptions}
                />
                <Toggle label="Essential?" value={it.essential ?? true} onChange={(b) => update({ essential: b })} />
              </div>
            </div>
          )}
        />
      </Section>

      <Section title="Budget limits">
        <ListField<BudgetLimit>
          title="Limits"
          items={form.budget_limits ?? []}
          onChange={(v) => set("budget_limits", v)}
          newItem={() => ({ category: "", limit: 0, current_spending: 0 })}
          addLabel="Add limit"
          renderRow={(it, update) => (
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Category" value={it.category} onChange={(v) => update({ category: v })} />
              <NumberField label="Limit" value={it.limit} onChange={(v) => update({ limit: v })} />
            </div>
          )}
        />
      </Section>

      <Section title="Financial goals">
        <Select
          label="Top priority right now"
          value={form.goal_priority}
          onChange={(v) => set("goal_priority", v)}
          options={[
            { value: "build-emergency-fund", label: "Build emergency fund" },
            { value: "reduce-debt", label: "Reduce debt" },
            { value: "cover-rent", label: "Cover rent" },
            { value: "invest-small", label: "Invest small amounts" },
            { value: "learn-skill", label: "Learn a new skill" },
          ]}
        />
        <ListField<FinancialGoal>
          title="Specific goals"
          items={form.financial_goals ?? []}
          onChange={(v) => set("financial_goals", v)}
          newItem={() => ({ name: "", target_amount: 0, current_amount: 0, priority: "medium" })}
          addLabel="Add goal"
          renderRow={(it, update) => (
            <div className="space-y-3">
              <TextField label="Goal" value={it.name} onChange={(v) => update({ name: v })} />
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Target" value={it.target_amount} onChange={(v) => update({ target_amount: v })} />
                <NumberField label="Saved" value={it.current_amount} onChange={(v) => update({ current_amount: v })} />
              </div>
              <Select<Priority>
                label="Priority"
                value={it.priority}
                onChange={(v) => update({ priority: v })}
                options={priorityOptions}
              />
            </div>
          )}
        />
      </Section>

      <Section title="Job search">
        <Toggle
          label="Currently job searching?"
          value={form.job_search_details?.active ?? true}
          onChange={(b) =>
            set("job_search_details", { ...(form.job_search_details ?? {}), active: b })
          }
        />
        {form.job_search_details?.active && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Applications per week"
                value={form.job_search_details?.applications_per_week}
                onChange={(v) =>
                  set("job_search_details", {
                    ...(form.job_search_details ?? {}),
                    applications_per_week: v,
                  })
                }
              />
              <NumberField
                label="Job search budget"
                value={form.job_search_details?.job_search_budget}
                onChange={(v) =>
                  set("job_search_details", {
                    ...(form.job_search_details ?? {}),
                    job_search_budget: v,
                  })
                }
              />
            </div>
            <TextField
              label="Industries targeted (comma-separated)"
              value={(form.job_search_details?.industries_targeted ?? []).join(", ")}
              onChange={(v) =>
                set("job_search_details", {
                  ...(form.job_search_details ?? {}),
                  industries_targeted: v.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
              placeholder="Tech, Finance, Healthcare"
            />
            <TextField
              label="Skills you're developing (comma-separated)"
              value={(form.job_search_details?.skills_development ?? []).join(", ")}
              onChange={(v) =>
                set("job_search_details", {
                  ...(form.job_search_details ?? {}),
                  skills_development: v.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
              placeholder="Python, SQL, design"
            />
          </>
        )}
        <Select
          label="Open to gig work?"
          value={form.gig_interest}
          onChange={(v) => set("gig_interest", v)}
          options={[
            { value: "not-at-all", label: "Not at all" },
            { value: "somewhat", label: "Somewhat" },
            { value: "very-open", label: "Very open" },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Toggle
            label="Have basic tools (laptop, internet)?"
            value={form.has_tools ?? true}
            onChange={(b) => set("has_tools", b)}
          />
          <Toggle
            label="Willing to relocate?"
            value={form.willing_to_relocate ?? false}
            onChange={(b) => set("willing_to_relocate", b)}
          />
        </div>
      </Section>

      <Section title="Support" hint="What kind of help would you like?">
        <div className="grid grid-cols-1 gap-3">
          <Toggle
            label="Want budget help?"
            value={form.support_resources?.wants_budget_help ?? false}
            onChange={(b) =>
              set("support_resources", { ...(form.support_resources ?? {}), wants_budget_help: b })
            }
          />
          <Toggle
            label="Want job resources?"
            value={form.support_resources?.wants_job_resources ?? false}
            onChange={(b) =>
              set("support_resources", { ...(form.support_resources ?? {}), wants_job_resources: b })
            }
          />
          <Toggle
            label="Want debt advice?"
            value={form.support_resources?.wants_debt_advice ?? false}
            onChange={(b) =>
              set("support_resources", { ...(form.support_resources ?? {}), wants_debt_advice: b })
            }
          />
        </div>
      </Section>

      <Section title="Preferences">
        <Select<SF>
          label="Summary frequency"
          value={form.summary_frequency}
          onChange={(v) => set("summary_frequency", v)}
          options={summaryOptions}
        />
      </Section>

      <SubmitButton pending={mutation.isPending} />
    </form>
  )
}

// ── Retired ───────────────────────────────────────────────────────────────

function RetiredFormView({ userId }: { userId: string }) {
  const navigate = useNavigate()
  const [form, setForm] = useState<RetiredForm>({
    user_id: userId,
    pension: { receives: false, amount: 0, frequency: "monthly" },
    other_income_sources: [],
    retirement_account_withdrawals: [],
    housing: { mortgage_or_rent: 0, insurance: 0, maintenance: 0 },
    healthcare: { monthly_premium: 0, out_of_pocket: 0 },
    other_expenses: [],
    retirement_accounts: [],
    other_assets: [],
    savings_goals: [],
    legacy_planning: { beneficiaries: [] },
  })

  const set = <K extends keyof RetiredForm>(k: K, v: RetiredForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: () => {
      const beneficiaries = (form.legacy_planning?.beneficiaries ?? []).filter(
        (b) => b.name.trim() !== "" && b.percentage >= 0 && b.percentage <= 100,
      )
      const total = beneficiaries.reduce((s, b) => s + b.percentage, 0)
      if (total > 100) {
        throw new Error("Beneficiary percentages add up to more than 100%.")
      }

      return api.submitRetired({
        ...form,
        other_income_sources: cleanIncomeSources(form.other_income_sources ?? []),
        retirement_account_withdrawals: (form.retirement_account_withdrawals ?? [])
          .filter((w) => w.type.trim() !== "" && w.monthly_amount >= 0)
          .map((w) => ({ ...w, type: w.type.trim() })),
        other_expenses: (form.other_expenses ?? [])
          .filter((e) => e.name.trim() !== "" && e.amount >= 0)
          .map((e) => ({ ...e, name: e.name.trim(), frequency: e.frequency ?? "monthly" })),
        retirement_accounts: (form.retirement_accounts ?? [])
          .filter((a) => a.type.trim() !== "" && a.current_value >= 0)
          .map((a) => ({ ...a, type: a.type.trim() })),
        other_assets: (form.other_assets ?? [])
          .filter((a) => a.type.trim() !== "" && a.estimated_value >= 0)
          .map((a) => ({ ...a, type: a.type.trim() })),
        savings_goals: (form.savings_goals ?? [])
          .filter((g) => g.name.trim() !== "" && g.target_amount > 0)
          .map((g) => ({ ...g, name: g.name.trim(), current_amount: g.current_amount ?? 0 })),
        legacy_planning: { beneficiaries },
      })
    },
    onSuccess: () => navigate({ to: "/quiz" }),
  })

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      {mutation.isError && <ErrorBox message={(mutation.error as Error).message} />}

      <Section title="Pension">
        <Toggle
          label="Do you receive a pension?"
          value={form.pension?.receives ?? false}
          onChange={(b) => set("pension", { ...(form.pension ?? { receives: false }), receives: b })}
        />
        {form.pension?.receives && (
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Amount"
              value={form.pension?.amount}
              onChange={(v) => set("pension", { ...(form.pension ?? { receives: true }), amount: v })}
            />
            <Select<PayFrequency>
              label="Frequency"
              value={form.pension?.frequency}
              onChange={(v) => set("pension", { ...(form.pension ?? { receives: true }), frequency: v })}
              options={payFrequencyOptions}
            />
          </div>
        )}
      </Section>

      <Section title="Other income sources" hint="Rental, dividends, part-time work...">
        <ListField<IncomeSource>
          title="Sources"
          items={form.other_income_sources ?? []}
          onChange={(v) => set("other_income_sources", v)}
          newItem={() => ({ name: "", amount: 0, frequency: "monthly" })}
          addLabel="Add source"
          renderRow={(it, update) => (
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Name" value={it.name} onChange={(v) => update({ name: v })} placeholder="Rental income" />
              <NumberField label="Amount" value={it.amount} onChange={(v) => update({ amount: v })} />
              <Select<PayFrequency>
                label="Frequency"
                value={it.frequency}
                onChange={(v) => update({ frequency: v })}
                options={payFrequencyOptions}
              />
            </div>
          )}
        />
      </Section>

      <Section title="Retirement account withdrawals">
        <ListField<RetirementAccountWithdrawal>
          title="Withdrawals"
          items={form.retirement_account_withdrawals ?? []}
          onChange={(v) => set("retirement_account_withdrawals", v)}
          newItem={() => ({ type: "", monthly_amount: 0 })}
          addLabel="Add withdrawal"
          renderRow={(it, update) => (
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Account type" value={it.type} onChange={(v) => update({ type: v })} placeholder="PPF / 401k" />
              <NumberField label="Monthly amount" value={it.monthly_amount} onChange={(v) => update({ monthly_amount: v })} />
            </div>
          )}
        />
      </Section>

      <Section title="Housing (monthly)">
        <div className="grid grid-cols-3 gap-3">
          <NumberField
            label="Rent / mortgage"
            value={form.housing?.mortgage_or_rent}
            onChange={(v) => set("housing", { ...(form.housing ?? {}), mortgage_or_rent: v })}
          />
          <NumberField
            label="Insurance"
            value={form.housing?.insurance}
            onChange={(v) => set("housing", { ...(form.housing ?? {}), insurance: v })}
          />
          <NumberField
            label="Maintenance"
            value={form.housing?.maintenance}
            onChange={(v) => set("housing", { ...(form.housing ?? {}), maintenance: v })}
          />
        </div>
      </Section>

      <Section title="Healthcare (monthly)">
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Premium"
            value={form.healthcare?.monthly_premium}
            onChange={(v) => set("healthcare", { ...(form.healthcare ?? {}), monthly_premium: v })}
          />
          <NumberField
            label="Out of pocket"
            value={form.healthcare?.out_of_pocket}
            onChange={(v) => set("healthcare", { ...(form.healthcare ?? {}), out_of_pocket: v })}
          />
        </div>
      </Section>

      <Section title="Other regular expenses">
        <ListField<OtherExpense>
          title="Expenses"
          items={form.other_expenses ?? []}
          onChange={(v) => set("other_expenses", v)}
          newItem={() => ({ name: "", amount: 0, frequency: "monthly" })}
          addLabel="Add expense"
          renderRow={(it, update) => (
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Name" value={it.name} onChange={(v) => update({ name: v })} placeholder="Groceries" />
              <NumberField label="Amount" value={it.amount} onChange={(v) => update({ amount: v })} />
              <Select<PayFrequency>
                label="Frequency"
                value={it.frequency}
                onChange={(v) => update({ frequency: v })}
                options={payFrequencyOptions}
              />
            </div>
          )}
        />
      </Section>

      <Section title="Retirement accounts">
        <ListField<RetirementAccount>
          title="Accounts"
          items={form.retirement_accounts ?? []}
          onChange={(v) => set("retirement_accounts", v)}
          newItem={() => ({ type: "", current_value: 0 })}
          addLabel="Add account"
          renderRow={(it, update) => (
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Type" value={it.type} onChange={(v) => update({ type: v })} placeholder="PPF / IRA" />
              <NumberField label="Current value" value={it.current_value} onChange={(v) => update({ current_value: v })} />
            </div>
          )}
        />
      </Section>

      <Section title="Other assets" hint="Property, vehicles, investments outside retirement accounts.">
        <ListField<OtherAsset>
          title="Assets"
          items={form.other_assets ?? []}
          onChange={(v) => set("other_assets", v)}
          newItem={() => ({ type: "", estimated_value: 0 })}
          addLabel="Add asset"
          renderRow={(it, update) => (
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Type" value={it.type} onChange={(v) => update({ type: v })} placeholder="Property" />
              <NumberField label="Estimated value" value={it.estimated_value} onChange={(v) => update({ estimated_value: v })} />
            </div>
          )}
        />
      </Section>

      <Section title="Savings goals">
        <ListField<SavingsGoal>
          title="Goals"
          items={form.savings_goals ?? []}
          onChange={(v) => set("savings_goals", v)}
          newItem={() => ({ name: "", target_amount: 0, current_amount: 0, category: "" })}
          addLabel="Add goal"
          renderRow={(it, update) => (
            <div className="space-y-3">
              <TextField label="Goal" value={it.name} onChange={(v) => update({ name: v })} placeholder="Travel fund" />
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Target" value={it.target_amount} onChange={(v) => update({ target_amount: v })} />
                <NumberField label="Saved" value={it.current_amount} onChange={(v) => update({ current_amount: v })} />
              </div>
              <TextField label="Category" value={it.category} onChange={(v) => update({ category: v })} placeholder="travel" />
            </div>
          )}
        />
      </Section>

      <Section
        title="Legacy planning"
        hint="Who should inherit your estate? Total percentages must be ≤ 100."
      >
        <ListField<Beneficiary>
          title="Beneficiaries"
          items={form.legacy_planning?.beneficiaries ?? []}
          onChange={(v) => set("legacy_planning", { beneficiaries: v })}
          newItem={() => ({ name: "", relationship: "", percentage: 0 })}
          addLabel="Add beneficiary"
          renderRow={(it, update) => (
            <div className="grid grid-cols-3 gap-3">
              <TextField label="Name" value={it.name} onChange={(v) => update({ name: v })} placeholder="Jane" />
              <TextField label="Relationship" value={it.relationship} onChange={(v) => update({ relationship: v })} placeholder="spouse" />
              <NumberField label="Percentage" value={it.percentage} onChange={(v) => update({ percentage: v })} />
            </div>
          )}
        />
      </Section>

      <SubmitButton pending={mutation.isPending} />
    </form>
  )
}
