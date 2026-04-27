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

// ── Auth ──────────────────────────────────────────────────────────────────

export interface SignupPayload {
  full_name?: string
  email: string
  password: string
  currency?: "INR" | "USD" | "EUR"
  user_type?: "student" | "employed" | "unemployed" | "retired" | "guest"
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
}
