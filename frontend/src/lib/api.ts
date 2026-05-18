const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export interface ChatStreamHandlers {
  onMeta?: (m: { conversation_id?: string }) => void
  onDelta?: (text: string) => void
  onDone?: (m: { reply?: string }) => void
}

function parseSseFrame(frame: string): { event: string | null; data: unknown } {
  let event: string | null = null
  let dataRaw = ""
  for (const line of frame.split("\n")) {
    if (line.startsWith("event: ")) event = line.slice(7).trim()
    else if (line.startsWith("data: ")) dataRaw += line.slice(6)
  }
  let data: unknown = null
  if (dataRaw) {
    try {
      data = JSON.parse(dataRaw)
    } catch {
      data = null
    }
  }
  return { event, data }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include", // send/receive HTTP-only auth cookie
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    const detail = data?.detail
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => `${d.loc?.slice(-1)?.[0] ?? "field"}: ${d.msg}`).join(", ")
          : `Request failed (${res.status})`
    throw new ApiError(res.status, msg)
  }

  return data as T
}

// ── Enums ─────────────────────────────────────────────────────────────────

export type UserType = "student" | "employed" | "unemployed" | "retired"
export type Priority = "high" | "medium" | "low"
export type SummaryFrequency = "daily" | "weekly" | "bi-weekly" | "monthly" | "never"
export type EducationLevel = "school" | "college" | "university" | "other"
export type StudentLivingSituation = "hostel" | "family" | "rental" | "pg" | "other"
export type ParentFunded = "yes" | "no" | "partially"
export type EmploymentType =
  | "full-time"
  | "part-time"
  | "contract"
  | "self-employed"
  | "freelance"
export type PayFrequency =
  | "weekly"
  | "bi-weekly"
  | "monthly"
  | "semi-monthly"
  | "annually"
export type RiskTolerance = "low" | "medium" | "high"
export type ExperienceLevel = "beginner" | "intermediate" | "expert"
export type EmploymentStatus =
  | "actively-seeking"
  | "taking-break"
  | "studying"
  | "caring"
  | "disabled"
export type UnemployedLivingSituation = "alone" | "with-family" | "with-roommates"
export type GigInterest = "not-at-all" | "somewhat" | "very-open"
export type GoalPriority =
  | "build-emergency-fund"
  | "reduce-debt"
  | "cover-rent"
  | "invest-small"
  | "learn-skill"

// ── Sub-documents ────────────────────────────────────────────────────────

export interface FinancialGoal {
  name: string
  target_amount: number
  current_amount?: number
  target_date?: string | null
  priority?: Priority
  progress?: number
}

export interface CustomCategory {
  name: string
  budget_limit: number
  actual_spent?: number
}

export interface IncomeSource {
  name?: string
  source_type?: string
  amount: number
  frequency?: PayFrequency
  description?: string
}

export interface FixedExpense {
  category: string
  amount: number
  due_date?: string | null
}

export interface RegularExpense {
  category: string
  amount: number
  frequency?: PayFrequency
  essential?: boolean
}

export interface BudgetLimit {
  category: string
  limit: number
  current_spending?: number
}

export interface BonusDetails {
  amount: number
  frequency?: string
  last_received?: string | null
}

export interface InvestmentPreferences {
  risk_tolerance?: RiskTolerance
  interested_in?: string[]
  experience_level?: ExperienceLevel
}

export interface LastJobDetails {
  industry?: string
  position?: string
  duration?: string
}

export interface DebtInfo {
  amount?: number
  monthly_payment?: number
  type?: string
}

export interface SavingsDetails {
  amount?: number
  emergency_fund?: number
  months_covered?: number
}

export interface JobSearchDetails {
  active?: boolean
  applications_per_week?: number
  job_search_budget?: number
  industries_targeted?: string[]
  skills_development?: string[]
}

export interface SupportResources {
  wants_budget_help?: boolean
  wants_job_resources?: boolean
  wants_debt_advice?: boolean
}

export interface PensionInfo {
  receives: boolean
  amount?: number
  frequency?: PayFrequency
}

export interface HousingInfo {
  mortgage_or_rent?: number
  insurance?: number
  maintenance?: number
}

export interface HealthcareInfo {
  monthly_premium?: number
  out_of_pocket?: number
}

export interface OtherExpense {
  name: string
  amount: number
  frequency?: PayFrequency
}

export interface RetirementAccountWithdrawal {
  type: string
  monthly_amount: number
}

export interface RetirementAccount {
  type: string
  current_value: number
}

export interface OtherAsset {
  type: string
  estimated_value: number
}

export interface SavingsGoal {
  name: string
  target_amount: number
  current_amount?: number
  category?: string
}

export interface Beneficiary {
  name: string
  relationship?: string
  percentage: number
}

export interface LegacyPlanning {
  beneficiaries?: Beneficiary[]
}

// ── Auth ──────────────────────────────────────────────────────────────────

export interface SignupPayload {
  full_name?: string
  email: string
  password: string
  currency?: "INR" | "USD" | "EUR"
  user_type?: UserType | "guest"
}

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthResponse {
  message: string
  user_id?: string
  user_type?: string
}

export interface MessageResponse {
  message: string
}

export interface MeResponse {
  user_id: string
  email: string
  full_name?: string
  user_type?: string
  email_verified: boolean
}

export interface ForgotPasswordPayload {
  email: string
}

export interface ResetPasswordPayload {
  token: string
  new_password: string
}

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
}

// ── Onboarding requests ──────────────────────────────────────────────────

export interface StudentForm {
  user_id: string
  education_level: EducationLevel
  institution_name?: string
  living_situation: StudentLivingSituation
  monthly_allowance?: number
  is_parent_funded: ParentFunded
  custom_categories?: CustomCategory[]
  financial_goals?: FinancialGoal[]
  summary_frequency?: SummaryFrequency
}

export interface EmployedForm {
  user_id: string
  job_title?: string
  employment_type?: EmploymentType
  company?: string
  work_industry?: string
  work_location?: string
  monthly_salary?: number
  pay_frequency?: PayFrequency
  additional_income_sources?: IncomeSource[]
  has_bonuses?: boolean
  bonus_details?: BonusDetails | null
  fixed_expenses?: FixedExpense[]
  budget_limits?: BudgetLimit[]
  financial_goals?: FinancialGoal[]
  summary_frequency?: SummaryFrequency
  investment_preferences?: InvestmentPreferences | null
}

export interface UnemployedForm {
  user_id: string
  employment_status?: EmploymentStatus
  last_job_details?: LastJobDetails | null
  current_income?: number
  income_sources?: IncomeSource[]
  debt?: DebtInfo | null
  comfort_budget?: number
  runway_estimate?: number
  living_situation?: UnemployedLivingSituation
  has_dependents?: boolean
  dependents_count?: number
  gig_interest?: GigInterest
  has_tools?: boolean
  willing_to_relocate?: boolean
  goal_priority?: GoalPriority
  savings_details?: SavingsDetails | null
  regular_expenses?: RegularExpense[]
  budget_limits?: BudgetLimit[]
  financial_goals?: FinancialGoal[]
  job_search_details?: JobSearchDetails | null
  summary_frequency?: SummaryFrequency
  support_resources?: SupportResources | null
}

export interface RetiredForm {
  user_id: string
  pension?: PensionInfo | null
  other_income_sources?: IncomeSource[]
  retirement_account_withdrawals?: RetirementAccountWithdrawal[]
  housing?: HousingInfo | null
  healthcare?: HealthcareInfo | null
  other_expenses?: OtherExpense[]
  retirement_accounts?: RetirementAccount[]
  other_assets?: OtherAsset[]
  savings_goals?: SavingsGoal[]
  legacy_planning?: LegacyPlanning | null
}

// ── Profile summaries (mirror of backend ProfileSummary schemas) ─────────

export interface StudentProfile {
  education_level: EducationLevel
  institution_name?: string
  living_situation: StudentLivingSituation
  monthly_allowance?: number
  is_parent_funded: ParentFunded
  custom_categories?: CustomCategory[]
  financial_goals?: FinancialGoal[]
  summary_frequency: SummaryFrequency
  quiz_responses?: { question: string; answer: string }[]
  created_at?: string
  updated_at?: string
}

export interface EmployedProfile {
  job_title?: string
  employment_type?: EmploymentType
  company?: string
  work_industry?: string
  work_location?: string
  monthly_salary?: number
  pay_frequency?: PayFrequency
  additional_income_sources?: IncomeSource[]
  has_bonuses?: boolean
  bonus_details?: BonusDetails | null
  fixed_expenses?: FixedExpense[]
  budget_limits?: BudgetLimit[]
  financial_goals?: FinancialGoal[]
  summary_frequency?: SummaryFrequency
  investment_preferences?: InvestmentPreferences | null
  quiz_responses?: { question: string; answer: string }[]
  created_at?: string
  updated_at?: string
}

export interface UnemployedProfile {
  employment_status?: EmploymentStatus
  last_job_details?: LastJobDetails | null
  current_income?: number
  income_sources?: IncomeSource[]
  debt?: DebtInfo | null
  comfort_budget?: number
  runway_estimate?: number
  living_situation?: UnemployedLivingSituation
  has_dependents?: boolean
  dependents_count?: number
  gig_interest?: GigInterest
  has_tools?: boolean
  willing_to_relocate?: boolean
  goal_priority?: GoalPriority
  savings_details?: SavingsDetails | null
  regular_expenses?: RegularExpense[]
  budget_limits?: BudgetLimit[]
  financial_goals?: FinancialGoal[]
  job_search_details?: JobSearchDetails | null
  summary_frequency?: SummaryFrequency
  support_resources?: SupportResources | null
  quiz_responses?: { question: string; answer: string }[]
  created_at?: string
  updated_at?: string
}

export interface RetiredProfile {
  pension?: PensionInfo | null
  other_income_sources?: IncomeSource[]
  retirement_account_withdrawals?: RetirementAccountWithdrawal[]
  housing?: HousingInfo | null
  healthcare?: HealthcareInfo | null
  other_expenses?: OtherExpense[]
  retirement_accounts?: RetirementAccount[]
  other_assets?: OtherAsset[]
  savings_goals?: SavingsGoal[]
  legacy_planning?: LegacyPlanning | null
  quiz_responses?: { question: string; answer: string }[]
  created_at?: string
  updated_at?: string
}

// ── Dashboard ────────────────────────────────────────────────────────────

export interface DashboardResponse {
  needs_onboarding: boolean
  quiz_completed?: boolean
  user?: { email: string; full_name?: string; currency?: string }
  ai_advice?: string
  student?: StudentProfile
  employed?: EmployedProfile
  unemployed?: UnemployedProfile
  retired?: RetiredProfile
}

// ── Endpoints ────────────────────────────────────────────────────────────

const submitUserType = <T>(type: string, data: T) =>
  request<{ message: string; user_type: string }>(`/userType/${type}`, {
    method: "POST",
    body: JSON.stringify(data),
  })

export const api = {
  signup: (data: SignupPayload) =>
    request<AuthResponse>("/user/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: LoginPayload) =>
    request<AuthResponse>("/user/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  logout: () => request<{ message: string }>("/user/logout"),
  logoutAll: () =>
    request<MessageResponse>("/user/logout-all", { method: "POST" }),
  guest: () => request<AuthResponse>("/user/guest"),

  me: () => request<MeResponse>("/user/me"),

  forgotPassword: (data: ForgotPasswordPayload) =>
    request<MessageResponse>("/user/forgot-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  resetPassword: (data: ResetPasswordPayload) =>
    request<MessageResponse>("/user/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  changePassword: (data: ChangePasswordPayload) =>
    request<MessageResponse>("/user/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  verifyEmail: (token: string) =>
    request<MessageResponse>(`/user/verify-email?token=${encodeURIComponent(token)}`),

  resendVerification: () =>
    request<MessageResponse>("/user/resend-verification", { method: "POST" }),

  submitStudent: (data: StudentForm) => submitUserType("student", data),
  submitEmployed: (data: EmployedForm) => submitUserType("employed", data),
  submitUnemployed: (data: UnemployedForm) => submitUserType("unemployed", data),
  submitRetired: (data: RetiredForm) => submitUserType("retired", data),

  getDashboard: (type: UserType) =>
    request<DashboardResponse>(`/dashboard/${type}`),

  regenerateAdvice: (type: UserType) =>
    request<DashboardResponse>(`/dashboard/${type}/regenerate-advice`, {
      method: "POST",
    }),

  submitQuiz: (type: UserType, answers: QuizAnswer[]) =>
    request<{ message: string; user_type: string }>(`/quiz/${type}`, {
      method: "POST",
      body: JSON.stringify({ user_id: session.read()?.user_id, answers }),
    }),

  chat: (type: UserType, message: string, history: ChatTurn[], conversationId?: string) =>
    request<{ reply: string; conversation_id: string }>(`/chat/${type}`, {
      method: "POST",
      body: JSON.stringify({
        user_id: session.read()?.user_id,
        message,
        history,
        conversation_id: conversationId,
      }),
    }),

  chatStream: async (
    type: UserType,
    message: string,
    history: ChatTurn[],
    conversationId: string | undefined,
    handlers: ChatStreamHandlers,
    signal?: AbortSignal,
  ): Promise<void> => {
    const res = await fetch(`${API_BASE}/chat/${type}/stream`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({
        user_id: session.read()?.user_id,
        message,
        history,
        conversation_id: conversationId,
      }),
      signal,
    })

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "")
      throw new ApiError(res.status, text || `Request failed (${res.status})`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    // SSE frames are separated by a blank line. Lines within a frame are
    // either `event: <name>` or `data: <json>` — we accumulate until we hit
    // \n\n, then dispatch.
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let sepIndex: number
      while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, sepIndex)
        buffer = buffer.slice(sepIndex + 2)
        const { event, data } = parseSseFrame(frame)
        if (!event) continue

        if (event === "meta") handlers.onMeta?.(data as { conversation_id?: string })
        else if (event === "delta") handlers.onDelta?.((data as { text?: string })?.text ?? "")
        else if (event === "done") handlers.onDone?.(data as { reply?: string })
        else if (event === "error")
          throw new ApiError(500, (data as { message?: string })?.message ?? "Stream error")
      }
    }
  },

  listConversations: () => request<ConversationSummary[]>("/conversations"),

  getConversation: (id: string) => request<ConversationDetail>(`/conversations/${id}`),

  renameConversation: (id: string, title: string) =>
    request<ConversationSummary>(`/conversations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),

  deleteConversation: (id: string) =>
    request<null>(`/conversations/${id}`, {
      method: "DELETE",
    }),

  getAiProviders: () => request<AiProvidersResponse>("/ai-settings/providers"),

  getAiSettings: () => request<AiSettings>("/ai-settings"),

  updateAiSettings: (data: AiSettingsUpdate) =>
    request<AiSettings>("/ai-settings", {
      method: "POST",
      body: JSON.stringify(data),
    }),
}

// ── AI settings types ────────────────────────────────────────────────────

export interface AiProvider {
  id: string
  label: string
  models: string[]
  needs_api_key: boolean
}

export interface AiProvidersResponse {
  providers: AiProvider[]
}

export interface AiSettings {
  provider: string
  model: string
  has_api_key: boolean
}

export interface AiSettingsUpdate {
  provider: string
  model: string
  api_key?: string | null
}

export interface QuizAnswer {
  question: string
  answer: string
}

export interface ChatTurn {
  role: "user" | "assistant"
  content: string
}

export interface ConversationSummary {
  id: string
  title: string
  user_type?: string | null
  created_at: string
  updated_at: string
}

export interface ConversationDetail extends ConversationSummary {
  messages: ChatTurn[]
}

// ── Local session helpers ─────────────────────────────────────────────────

const SESSION_KEY = "rukiai.session"

export interface LocalSession {
  user_id: string
  user_type?: UserType | "guest"
}

export const session = {
  save(s: LocalSession) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s))
  },
  read(): LocalSession | null {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as LocalSession
    } catch {
      return null
    }
  },
  clear() {
    localStorage.removeItem(SESSION_KEY)
  },
  setUserType(type: UserType) {
    const cur = session.read()
    if (!cur) return
    session.save({ ...cur, user_type: type })
  },
}
