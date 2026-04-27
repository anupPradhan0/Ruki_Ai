import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { AlertCircle, GraduationCap, Briefcase, Coffee, PiggyBank, Loader2 } from "lucide-react"
import {
  api,
  session,
  type UserType,
  type StudentForm,
  type EmployedForm,
  type UnemployedForm,
  type RetiredForm,
} from "@/lib/api"

const userTypes: { value: UserType; label: string; tagline: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { value: "student", label: "Student", tagline: "School, college, or university", icon: GraduationCap },
  { value: "employed", label: "Employed", tagline: "Salary, freelance, or self-employed", icon: Briefcase },
  { value: "unemployed", label: "Unemployed", tagline: "Between jobs or taking a break", icon: Coffee },
  { value: "retired", label: "Retired", tagline: "Pension and savings life", icon: PiggyBank },
]

const inputCls =
  "w-full bg-[#0F0F0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FFD700]/50 transition-colors"
const labelCls = "block text-sm font-medium mb-2 text-white/80"

export default function OnboardingPage() {
  const navigate = useNavigate()
  const sess = useMemo(() => session.read(), [])
  const [userType, setUserType] = useState<UserType | "">(
    (sess?.user_type as UserType) || ""
  )

  // Redirect users with no session back to signup
  useEffect(() => {
    if (!sess?.user_id) {
      navigate({ to: "/signup" })
    }
  }, [sess, navigate])

  if (!sess?.user_id) return null

  return (
    <div className="flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Tell us about yourself</h1>
          <p className="text-white/50 text-sm">
            A few questions so we can personalize your dashboard.
          </p>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-8 space-y-8">
          {/* Step 1 — pick type */}
          <div>
            <h2 className="text-sm font-semibold text-white/80 mb-3">1. I am a...</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {userTypes.map((t) => {
                const Icon = t.icon
                const active = userType === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      setUserType(t.value)
                      session.setUserType(t.value)
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all ${
                      active
                        ? "bg-[#FFD700]/10 border-[#FFD700] text-white"
                        : "border-white/10 text-white/60 hover:border-[#FFD700]/40 hover:text-white"
                    }`}
                  >
                    <Icon size={22} />
                    <span className="text-sm font-medium">{t.label}</span>
                    <span className="text-[11px] text-white/40 leading-tight">{t.tagline}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Step 2 — conditional form */}
          {userType && (
            <div>
              <h2 className="text-sm font-semibold text-white/80 mb-4">
                2. A few details about your finances
              </h2>
              {userType === "student" && <StudentForm userId={sess.user_id} />}
              {userType === "employed" && <EmployedForm userId={sess.user_id} />}
              {userType === "unemployed" && <UnemployedForm userId={sess.user_id} />}
              {userType === "retired" && <RetiredForm userId={sess.user_id} />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────

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
      {pending ? "Saving..." : "Continue to dashboard"}
    </button>
  )
}

function useGoToDashboard() {
  const navigate = useNavigate()
  return () => navigate({ to: "/dashboard" })
}

// ── Student ───────────────────────────────────────────────────────────────

function StudentForm({ userId }: { userId: string }) {
  const goNext = useGoToDashboard()
  const [form, setForm] = useState<StudentForm>({
    user_id: userId,
    education_level: "college",
    institution_name: "",
    living_situation: "hostel",
    monthly_allowance: 0,
    is_parent_funded: "yes",
    summary_frequency: "weekly",
  })

  const mutation = useMutation({
    mutationFn: () => api.submitStudent(form),
    onSuccess: goNext,
  })

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      {mutation.isError && <ErrorBox message={(mutation.error as Error).message} />}

      <Select
        label="Education level"
        value={form.education_level}
        onChange={(v) => setForm({ ...form, education_level: v as StudentForm["education_level"] })}
        options={[
          { value: "school", label: "School" },
          { value: "college", label: "College" },
          { value: "university", label: "University" },
          { value: "other", label: "Other" },
        ]}
      />

      <div>
        <label className={labelCls}>Institution name</label>
        <input
          className={inputCls}
          value={form.institution_name}
          onChange={(e) => setForm({ ...form, institution_name: e.target.value })}
          placeholder="Mumbai University"
        />
      </div>

      <Select
        label="Living situation"
        value={form.living_situation}
        onChange={(v) => setForm({ ...form, living_situation: v as StudentForm["living_situation"] })}
        options={[
          { value: "hostel", label: "Hostel" },
          { value: "family", label: "With family" },
          { value: "rental", label: "Rental" },
          { value: "pg", label: "PG" },
          { value: "other", label: "Other" },
        ]}
      />

      <NumberField
        label="Monthly allowance"
        value={form.monthly_allowance}
        onChange={(n) => setForm({ ...form, monthly_allowance: n })}
        placeholder="5000"
      />

      <Select
        label="Funded by parents?"
        value={form.is_parent_funded}
        onChange={(v) => setForm({ ...form, is_parent_funded: v as StudentForm["is_parent_funded"] })}
        options={[
          { value: "yes", label: "Yes" },
          { value: "partially", label: "Partially" },
          { value: "no", label: "No" },
        ]}
      />

      <Select
        label="How often should we summarize your spending?"
        value={form.summary_frequency}
        onChange={(v) => setForm({ ...form, summary_frequency: v as StudentForm["summary_frequency"] })}
        options={[
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
          { value: "monthly", label: "Monthly" },
        ]}
      />

      <SubmitButton pending={mutation.isPending} />
    </form>
  )
}

// ── Employed ──────────────────────────────────────────────────────────────

function EmployedForm({ userId }: { userId: string }) {
  const goNext = useGoToDashboard()
  const [form, setForm] = useState<EmployedForm>({
    user_id: userId,
    job_title: "",
    employment_type: "full-time",
    company: "",
    work_industry: "",
    monthly_salary: 0,
    pay_frequency: "monthly",
    summary_frequency: "monthly",
  })

  const mutation = useMutation({
    mutationFn: () => api.submitEmployed(form),
    onSuccess: goNext,
  })

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      {mutation.isError && <ErrorBox message={(mutation.error as Error).message} />}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Job title</label>
          <input
            required
            className={inputCls}
            value={form.job_title}
            onChange={(e) => setForm({ ...form, job_title: e.target.value })}
            placeholder="Software Engineer"
          />
        </div>
        <div>
          <label className={labelCls}>Company</label>
          <input
            className={inputCls}
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            placeholder="Acme Inc"
          />
        </div>
      </div>

      <Select
        label="Employment type"
        value={form.employment_type}
        onChange={(v) => setForm({ ...form, employment_type: v as EmployedForm["employment_type"] })}
        options={[
          { value: "full-time", label: "Full-time" },
          { value: "part-time", label: "Part-time" },
          { value: "contract", label: "Contract" },
          { value: "freelance", label: "Freelance" },
          { value: "self-employed", label: "Self-employed" },
        ]}
      />

      <div>
        <label className={labelCls}>Industry</label>
        <input
          className={inputCls}
          value={form.work_industry}
          onChange={(e) => setForm({ ...form, work_industry: e.target.value })}
          placeholder="Tech / Finance / Healthcare..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <NumberField
          label="Monthly salary"
          value={form.monthly_salary}
          onChange={(n) => setForm({ ...form, monthly_salary: n })}
          placeholder="80000"
        />
        <Select
          label="Pay frequency"
          value={form.pay_frequency}
          onChange={(v) => setForm({ ...form, pay_frequency: v as EmployedForm["pay_frequency"] })}
          options={[
            { value: "weekly", label: "Weekly" },
            { value: "biweekly", label: "Biweekly" },
            { value: "monthly", label: "Monthly" },
          ]}
        />
      </div>

      <Select
        label="Summary frequency"
        value={form.summary_frequency}
        onChange={(v) => setForm({ ...form, summary_frequency: v as EmployedForm["summary_frequency"] })}
        options={[
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
          { value: "monthly", label: "Monthly" },
        ]}
      />

      <SubmitButton pending={mutation.isPending} />
    </form>
  )
}

// ── Unemployed ────────────────────────────────────────────────────────────

function UnemployedForm({ userId }: { userId: string }) {
  const goNext = useGoToDashboard()
  const [form, setForm] = useState<UnemployedForm>({
    user_id: userId,
    employment_status: "actively-seeking",
    current_income: 0,
    comfort_budget: 0,
    runway_estimate: 30,
    living_situation: "with-family",
    has_dependents: false,
    dependents_count: 0,
    gig_interest: "somewhat",
    willing_to_relocate: false,
    goal_priority: "build-emergency-fund",
  })

  const mutation = useMutation({
    mutationFn: () => api.submitUnemployed(form),
    onSuccess: goNext,
  })

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      {mutation.isError && <ErrorBox message={(mutation.error as Error).message} />}

      <Select
        label="Current status"
        value={form.employment_status}
        onChange={(v) => setForm({ ...form, employment_status: v as UnemployedForm["employment_status"] })}
        options={[
          { value: "actively-seeking", label: "Actively seeking" },
          { value: "taking-break", label: "Taking a break" },
          { value: "studying", label: "Studying" },
          { value: "caring", label: "Caregiving" },
          { value: "disabled", label: "Disabled" },
        ]}
      />

      <div className="grid grid-cols-2 gap-4">
        <NumberField
          label="Current income (any source)"
          value={form.current_income}
          onChange={(n) => setForm({ ...form, current_income: n })}
          placeholder="0"
        />
        <NumberField
          label="Comfort budget / month"
          value={form.comfort_budget}
          onChange={(n) => setForm({ ...form, comfort_budget: n })}
          placeholder="15000"
        />
      </div>

      <NumberField
        label="Savings runway (days)"
        value={form.runway_estimate}
        onChange={(n) => setForm({ ...form, runway_estimate: n })}
        placeholder="90"
      />

      <Select
        label="Living situation"
        value={form.living_situation}
        onChange={(v) => setForm({ ...form, living_situation: v as UnemployedForm["living_situation"] })}
        options={[
          { value: "alone", label: "Alone" },
          { value: "with-family", label: "With family" },
          { value: "with-roommates", label: "With roommates" },
        ]}
      />

      <div className="grid grid-cols-2 gap-4">
        <Toggle
          label="Have dependents?"
          value={form.has_dependents}
          onChange={(b) => setForm({ ...form, has_dependents: b })}
        />
        <Toggle
          label="Open to relocating?"
          value={form.willing_to_relocate}
          onChange={(b) => setForm({ ...form, willing_to_relocate: b })}
        />
      </div>

      <Select
        label="Open to gig work?"
        value={form.gig_interest}
        onChange={(v) => setForm({ ...form, gig_interest: v as UnemployedForm["gig_interest"] })}
        options={[
          { value: "not-at-all", label: "Not at all" },
          { value: "somewhat", label: "Somewhat" },
          { value: "very-open", label: "Very open" },
        ]}
      />

      <Select
        label="Top priority right now"
        value={form.goal_priority}
        onChange={(v) => setForm({ ...form, goal_priority: v as UnemployedForm["goal_priority"] })}
        options={[
          { value: "build-emergency-fund", label: "Build emergency fund" },
          { value: "reduce-debt", label: "Reduce debt" },
          { value: "cover-rent", label: "Cover rent" },
          { value: "invest-small", label: "Invest small amounts" },
          { value: "learn-skill", label: "Learn a new skill" },
        ]}
      />

      <SubmitButton pending={mutation.isPending} />
    </form>
  )
}

// ── Retired ───────────────────────────────────────────────────────────────

function RetiredForm({ userId }: { userId: string }) {
  const goNext = useGoToDashboard()
  const [receivesPension, setReceivesPension] = useState(true)
  const [pensionAmount, setPensionAmount] = useState(0)
  const [pensionFreq, setPensionFreq] = useState<"monthly" | "yearly">("monthly")
  const [rent, setRent] = useState(0)
  const [insurance, setInsurance] = useState(0)
  const [maintenance, setMaintenance] = useState(0)
  const [premium, setPremium] = useState(0)
  const [outOfPocket, setOutOfPocket] = useState(0)

  const mutation = useMutation({
    mutationFn: () => {
      const payload: RetiredForm = {
        user_id: userId,
        pension: receivesPension
          ? { receives: true, amount: pensionAmount, frequency: pensionFreq }
          : { receives: false },
        housing: { mortgage_or_rent: rent, insurance, maintenance },
        healthcare: { monthly_premium: premium, out_of_pocket: outOfPocket },
      }
      return api.submitRetired(payload)
    },
    onSuccess: goNext,
  })

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      {mutation.isError && <ErrorBox message={(mutation.error as Error).message} />}

      <Toggle
        label="Do you receive a pension?"
        value={receivesPension}
        onChange={setReceivesPension}
      />

      {receivesPension && (
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Pension amount"
            value={pensionAmount}
            onChange={setPensionAmount}
            placeholder="30000"
          />
          <Select
            label="Frequency"
            value={pensionFreq}
            onChange={(v) => setPensionFreq(v as "monthly" | "yearly")}
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "yearly", label: "Yearly" },
            ]}
          />
        </div>
      )}

      <div>
        <h3 className="text-xs uppercase tracking-wide text-white/40 mb-3">Housing (monthly)</h3>
        <div className="grid grid-cols-3 gap-3">
          <NumberField label="Rent / mortgage" value={rent} onChange={setRent} />
          <NumberField label="Insurance" value={insurance} onChange={setInsurance} />
          <NumberField label="Maintenance" value={maintenance} onChange={setMaintenance} />
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-wide text-white/40 mb-3">Healthcare (monthly)</h3>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Premium" value={premium} onChange={setPremium} />
          <NumberField label="Out of pocket" value={outOfPocket} onChange={setOutOfPocket} />
        </div>
      </div>

      <SubmitButton pending={mutation.isPending} />
    </form>
  )
}

// ── Form primitives ───────────────────────────────────────────────────────

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <select
        className={inputCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0F0F0F]">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type="number"
        min={0}
        className={inputCls}
        value={Number.isFinite(value) ? value : 0}
        placeholder={placeholder}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
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
