import { Link } from "@tanstack/react-router"
import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Loader2, MailCheck } from "lucide-react"
import { api } from "@/lib/api"
import { AuthErrorBanner, AuthInput, ColdStartBanner, useColdStart } from "@/components/auth/AuthBits"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")

  const forgot = useMutation({
    mutationFn: (e: string) => api.forgotPassword({ email: e }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    forgot.mutate(email.trim())
  }

  const coldStart = useColdStart(forgot.isPending)

  return (
    <div className="flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Forgot your password?</h1>
          <p className="text-white/50 text-sm">
            Enter the email on your account and we'll send you a reset link.
          </p>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-6 sm:p-8">
          {forgot.isSuccess ? (
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-300">
                <MailCheck size={16} className="mt-0.5 shrink-0" />
                <span>{forgot.data?.message ?? "If an account exists for that email, a reset link is on its way."}</span>
              </div>
              <p className="text-white/50">
                Didn't get it? Check spam, or try again in a minute.
              </p>
              <Link to="/login" className="text-[#FFD700] hover:underline">
                Back to login
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {forgot.isError && (
                <AuthErrorBanner message={(forgot.error as Error)?.message ?? "Something went wrong"} />
              )}

              {coldStart && forgot.isPending && <ColdStartBanner />}

              <AuthInput
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                required
              />

              <button
                type="submit"
                disabled={forgot.isPending}
                className="w-full py-3.5 bg-[#FFD700] text-black font-semibold rounded-xl hover:bg-[#e6c200] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {forgot.isPending && <Loader2 size={16} className="animate-spin" />}
                {forgot.isPending ? "Sending..." : "Send reset link"}
              </button>

              <p className="text-center text-white/40 text-sm">
                Remembered it?{" "}
                <Link to="/login" className="text-[#FFD700] hover:underline font-medium">
                  Log in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
