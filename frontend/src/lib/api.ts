const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
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

// ── Types ─────────────────────────────────────────────────────────────────

export type UserType = "student" | "employed" | "unemployed" | "retired"

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

export interface StudentForm {
  user_id: string
  education_level: "school" | "college" | "university" | "other"
  institution_name?: string
  living_situation: "hostel" | "family" | "rental" | "pg" | "other"
  monthly_allowance: number
  is_parent_funded: "yes" | "no" | "partially"
  custom_categories?: { name: string; budget_limit: number; actual_spent?: number }[]
  financial_goals?: { name: string; target_amount: number; current_amount?: number; priority?: "high" | "medium" | "low" }[]
  summary_frequency: "daily" | "weekly" | "monthly"
}

export interface EmployedForm {
  user_id: string
  job_title: string
  employment_type: "full-time" | "part-time" | "contract" | "freelance" | "self-employed"
  company?: string
  work_industry?: string
  work_location?: string
  monthly_salary: number
  pay_frequency: "weekly" | "biweekly" | "monthly"
  has_bonuses?: boolean
  fixed_expenses?: { category: string; amount: number }[]
  summary_frequency: "daily" | "weekly" | "monthly"
}

export interface UnemployedForm {
  user_id: string
  employment_status:
    | "actively-seeking"
    | "taking-break"
    | "studying"
    | "caring"
    | "disabled"
  current_income: number
  comfort_budget: number
  runway_estimate: number
  living_situation: "alone" | "with-family" | "with-roommates"
  has_dependents: boolean
  dependents_count?: number
  gig_interest: "not-at-all" | "somewhat" | "very-open"
  willing_to_relocate: boolean
  goal_priority:
    | "build-emergency-fund"
    | "reduce-debt"
    | "cover-rent"
    | "invest-small"
    | "learn-skill"
}

export interface RetiredForm {
  user_id: string
  pension: { receives: boolean; amount?: number; frequency?: "monthly" | "yearly" }
  housing?: { mortgage_or_rent?: number; insurance?: number; maintenance?: number }
  healthcare?: { monthly_premium?: number; out_of_pocket?: number }
}

// Dashboard responses share a common envelope; the profile field varies by type.
export interface DashboardResponse {
  needs_onboarding: boolean
  user?: { email: string; full_name?: string; currency?: string }
  ai_advice?: string
  student?: unknown
  employed?: unknown
  unemployed?: unknown
  retired?: unknown
}

// ── Endpoints ─────────────────────────────────────────────────────────────

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
  guest: () => request<AuthResponse>("/user/guest"),

  submitStudent: (data: StudentForm) =>
    request<{ message: string; user_type: string }>("/userType/student", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  submitEmployed: (data: EmployedForm) =>
    request<{ message: string; user_type: string }>("/userType/employed", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  submitUnemployed: (data: UnemployedForm) =>
    request<{ message: string; user_type: string }>("/userType/unemployed", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  submitRetired: (data: RetiredForm) =>
    request<{ message: string; user_type: string }>("/userType/retired", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getDashboard: (type: UserType) =>
    request<DashboardResponse>(`/dashboard/${type}`),
}

// ── Local session helpers ─────────────────────────────────────────────────
// The backend auths via HTTP-only cookie, but onboarding endpoints need
// user_id in the body. We persist user_id + user_type from auth responses
// so the onboarding page can use them across reloads.

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
