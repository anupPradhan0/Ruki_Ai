import { Link, useSearch } from "@tanstack/react-router"
import { useEffect, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import { Loader2, MailCheck, AlertCircle } from "lucide-react"
import { api } from "@/lib/api"

export default function VerifyEmailPage() {
  const search = useSearch({ from: "/_auth/verify-email" }) as { token?: string }
  const token = search.token ?? ""

  const verify = useMutation({
    mutationFn: (t: string) => api.verifyEmail(t),
  })

  // StrictMode double-invokes effects in dev; without this guard the second
  // call hits a token that's already marked used and surfaces a fake error.
  const fired = useRef(false)
  useEffect(() => {
    if (!token || fired.current) return
    fired.current = true
    verify.mutate(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div className="flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-[#1A1A1A] rounded-2xl border border-white/5 p-6 sm:p-8 text-center">
        {!token ? (
          <>
            <h1 className="text-xl font-semibold mb-2">Verification link missing</h1>
            <p className="text-white/50 text-sm mb-4">
              This page expects a token in the URL. Use the button in your email.
            </p>
            <Link to="/login" className="text-[#FFD700] hover:underline text-sm">
              Back to login
            </Link>
          </>
        ) : verify.isPending ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="text-white/40 animate-spin" size={26} />
            <p className="text-white/60 text-sm">Verifying your email...</p>
          </div>
        ) : verify.isSuccess ? (
          <>
            <div className="w-11 h-11 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
              <MailCheck className="text-emerald-400" size={20} />
            </div>
            <h1 className="text-xl font-semibold mb-2">Email verified</h1>
            <p className="text-white/50 text-sm mb-5">
              Thanks — your account is now confirmed. You can close this tab or jump straight to your dashboard.
            </p>
            <Link
              to="/dashboard"
              className="inline-block px-5 py-2.5 rounded-xl bg-[#FFD700] text-black text-sm font-semibold hover:bg-[#e6c200] transition-colors"
            >
              Go to dashboard
            </Link>
          </>
        ) : (
          <>
            <div className="w-11 h-11 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
              <AlertCircle className="text-red-400" size={20} />
            </div>
            <h1 className="text-xl font-semibold mb-2">We couldn't verify that link</h1>
            <p className="text-white/50 text-sm mb-5">
              {(verify.error as Error)?.message ?? "The link is invalid or expired."} You can request a fresh one from the settings page after logging in.
            </p>
            <Link
              to="/login"
              className="inline-block px-5 py-2.5 rounded-xl bg-[#FFD700] text-black text-sm font-semibold hover:bg-[#e6c200] transition-colors"
            >
              Go to login
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
