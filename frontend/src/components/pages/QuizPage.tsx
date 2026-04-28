import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { AlertCircle, Loader2 } from "lucide-react"
import { api, session, type UserType, type QuizAnswer } from "@/lib/api"

// ── Question banks ───────────────────────────────────────────────────────

interface MCQ {
  q: string
  options: string[]
}

const QUESTIONS: Record<UserType, MCQ[]> = {
  student: [
    {
      q: "What is your primary source of money?",
      options: ["Parents/Guardians", "Part-time job", "Scholarship/Stipend", "Freelance/Business"],
    },
    {
      q: "How much do you save monthly (if at all)?",
      options: ["Nothing", "<10%", "10–30%", ">30%"],
    },
    {
      q: "What do you spend most on?",
      options: ["Food/Essentials", "Entertainment", "Gadgets/Shopping", "Education"],
    },
    {
      q: "Do you track your expenses?",
      options: ["Never", "Sometimes", "Regularly", "Strict budgeting"],
    },
    {
      q: "Do you have any debt?",
      options: ["None", "Small personal borrowings", "Education loan", "Credit card debt"],
    },
    {
      q: "What is your financial goal right now?",
      options: ["Just manage expenses", "Build savings", "Invest", "Start earning more"],
    },
    {
      q: "How comfortable are you with risk?",
      options: ["Very low", "Low", "Medium", "High"],
    },
    {
      q: "Do you invest anywhere?",
      options: ["No", "Savings account only", "Mutual funds", "Stocks/Crypto"],
    },
    {
      q: "Do you have an emergency fund?",
      options: ["No", "<1 month expenses", "1–3 months", "3+ months"],
    },
    {
      q: "What skill investment are you making?",
      options: ["None", "Free resources", "Paid courses", "Certifications/advanced training"],
    },
  ],
  employed: [
    {
      q: "What % of your income do you save?",
      options: ["0–10%", "10–20%", "20–40%", "40%+"],
    },
    {
      q: "Your biggest expense category?",
      options: ["Rent/EMI", "Lifestyle (food, outings)", "Family responsibilities", "Investments"],
    },
    {
      q: "Do you have an emergency fund?",
      options: ["No", "<3 months", "3–6 months", "6+ months"],
    },
    {
      q: "Do you have any loans?",
      options: ["None", "Personal loan", "Home/Car loan", "Multiple debts"],
    },
    {
      q: "Where do you invest mostly?",
      options: ["Not investing", "FD/Low-risk", "Mutual funds", "Stocks/High-risk"],
    },
    {
      q: "How stable is your job?",
      options: ["Very unstable", "Somewhat unstable", "Stable", "Very secure"],
    },
    {
      q: "Do you have insurance?",
      options: ["None", "Only health", "Health + life", "Comprehensive coverage"],
    },
    {
      q: "Do you track your net worth?",
      options: ["No", "Rarely", "Yearly", "Regularly"],
    },
    {
      q: "Your financial goal?",
      options: ["Survive month to month", "Save more", "Build wealth", "Financial independence"],
    },
    {
      q: "How do you handle salary increases?",
      options: ["Spend more", "Save a little more", "Invest majority", "Fully invest extra"],
    },
  ],
  unemployed: [
    {
      q: "Current income source?",
      options: ["None", "Savings", "Family support", "Freelance gigs"],
    },
    {
      q: "How long can you sustain without income?",
      options: ["<1 month", "1–3 months", "3–6 months", "6+ months"],
    },
    {
      q: "Do you have any debt?",
      options: ["No", "Small", "Moderate", "High"],
    },
    {
      q: "What is your biggest expense?",
      options: ["Rent", "Food", "Loans", "Misc"],
    },
    {
      q: "Are you actively upskilling?",
      options: ["No", "Occasionally", "Regularly", "Intensively"],
    },
    {
      q: "Job search activity level?",
      options: ["None", "Passive", "Active", "Very aggressive"],
    },
    {
      q: "Do you track spending?",
      options: ["No", "Rough idea", "Track sometimes", "Strict tracking"],
    },
    {
      q: "Do you have any investments?",
      options: ["None", "Liquid savings", "Some investments", "Diverse investments"],
    },
    {
      q: "Main financial goal?",
      options: ["Survival", "Reduce expenses", "Get income", "Build stability"],
    },
    {
      q: "Would you consider alternative income (gig, freelance)?",
      options: ["No", "Maybe", "Yes", "Already doing"],
    },
  ],
  retired: [
    {
      q: "Primary income source?",
      options: ["Pension", "Savings", "Investments", "Family support"],
    },
    {
      q: "Monthly expense coverage?",
      options: ["Not sufficient", "Just enough", "Comfortable", "Surplus"],
    },
    {
      q: "Do you have health insurance?",
      options: ["No", "Basic", "Good coverage", "Premium coverage"],
    },
    {
      q: "Investment style?",
      options: ["No investments", "Very safe (FDs)", "Balanced", "Risky"],
    },
    {
      q: "Emergency fund availability?",
      options: ["None", "<3 months", "3–6 months", "6+ months"],
    },
    {
      q: "Debt status?",
      options: ["None", "Small", "Moderate", "High"],
    },
    {
      q: "Biggest financial concern?",
      options: ["Healthcare", "Running out of money", "Supporting family", "Inflation"],
    },
    {
      q: "Do you track expenses?",
      options: ["No", "Rough idea", "Regularly", "Strictly"],
    },
    {
      q: "Estate planning (will, etc.)?",
      options: ["None", "Planning", "Done", "Updated regularly"],
    },
    {
      q: "Lifestyle preference?",
      options: ["Minimal", "Moderate", "Comfortable", "Luxurious"],
    },
  ],
}

// ── Component ────────────────────────────────────────────────────────────

const VALID_TYPES: UserType[] = ["student", "employed", "unemployed", "retired"]

export default function QuizPage() {
  const navigate = useNavigate()
  const sess = useMemo(() => session.read(), [])
  const userType = sess?.user_type as UserType | undefined

  useEffect(() => {
    if (!sess?.user_id) {
      navigate({ to: "/signup" })
    } else if (!userType || !VALID_TYPES.includes(userType)) {
      navigate({ to: "/onboarding" })
    }
  }, [sess, userType, navigate])

  const questions = userType && VALID_TYPES.includes(userType) ? QUESTIONS[userType] : []
  const [answers, setAnswers] = useState<(string | null)[]>(() => questions.map(() => null))
  const [step, setStep] = useState(0)

  const mutation = useMutation({
    mutationFn: () => {
      if (!userType) throw new Error("Missing user type")
      const payload: QuizAnswer[] = questions.map((q, i) => ({
        question: q.q,
        answer: answers[i] ?? "",
      }))
      return api.submitQuiz(userType, payload)
    },
    onSuccess: () => navigate({ to: "/dashboard" }),
  })

  if (!sess?.user_id || !userType || !VALID_TYPES.includes(userType)) return null

  const total = questions.length
  const current = questions[step]
  const selected = answers[step]
  const allAnswered = answers.every((a) => a !== null)
  const progress = ((step + (selected ? 1 : 0)) / total) * 100

  const pick = (option: string) => {
    setAnswers((prev) => {
      const next = [...prev]
      next[step] = option
      return next
    })
  }

  const next = () => {
    if (step < total - 1) setStep(step + 1)
  }
  const back = () => {
    if (step > 0) setStep(step - 1)
  }

  return (
    <div className="flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <div className="text-xs uppercase tracking-wide text-[#FFD700]/80 mb-2">Self-assessment</div>
          <h1 className="text-2xl font-bold mb-2">A few quick questions</h1>
          <p className="text-white/50 text-sm">
            10 multiple-choice questions. Helps the AI give you better, sharper advice.
          </p>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-6 sm:p-8">
          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-white/40 mb-2">
              <span>
                Question {step + 1} of {total}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FFD700] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {mutation.isError && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{(mutation.error as Error).message}</span>
            </div>
          )}

          {/* Question */}
          <div className="mb-6">
            <h2 className="text-lg font-medium text-white mb-4">{current.q}</h2>
            <div className="space-y-2">
              {current.options.map((opt, i) => {
                const active = selected === opt
                const letter = String.fromCharCode(65 + i)
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => pick(opt)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all ${
                      active
                        ? "bg-[#FFD700]/10 border-[#FFD700] text-white"
                        : "border-white/10 text-white/70 hover:border-[#FFD700]/40 hover:text-white"
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                        active ? "bg-[#FFD700] text-black" : "bg-white/5 text-white/60"
                      }`}
                    >
                      {letter}
                    </span>
                    <span>{opt}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Nav */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="px-5 py-3 rounded-xl text-sm font-medium border border-white/10 text-white/70 hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Back
            </button>

            {step < total - 1 ? (
              <button
                type="button"
                onClick={next}
                disabled={!selected}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[#FFD700] text-black hover:bg-[#e6c200] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={!allAnswered || mutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-[#FFD700] text-black hover:bg-[#e6c200] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
                {mutation.isPending ? "Saving..." : "Finish & see dashboard"}
              </button>
            )}
          </div>

          {/* Question dots */}
          <div className="flex justify-center gap-1.5 mt-6">
            {questions.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? "w-6 bg-[#FFD700]"
                    : answers[i]
                      ? "w-1.5 bg-[#FFD700]/40"
                      : "w-1.5 bg-white/10"
                }`}
                aria-label={`Go to question ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
