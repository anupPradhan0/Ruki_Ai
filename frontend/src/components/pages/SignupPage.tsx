import { Link, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Eye, EyeOff, Loader2, AlertCircle, Clock } from "lucide-react"
import { api, session, type SignupPayload, type UserType } from "@/lib/api"

const userTypes = [
  { label: "Student", value: "student" },
  { label: "Employed", value: "employed" },
  { label: "Unemployed", value: "unemployed" },
  { label: "Retired", value: "retired" },
] as const

type UserTypeValue = (typeof userTypes)[number]["value"]

export default function SignupPage() {
  const navigate = useNavigate()
  const [show, setShow] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [userType, setUserType] = useState<UserTypeValue | "">("")

  const signup = useMutation({
    mutationFn: (data: SignupPayload) => api.signup(data),
    onSuccess: (res) => {
      if (res.user_id) {
        session.save({
          user_id: res.user_id,
          user_type: (res.user_type as UserType | undefined) ?? (userType || undefined),
        })
      }
      navigate({ to: "/onboarding" })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || undefined

    signup.mutate({
      full_name: fullName,
      email: email.trim(),
      password,
      user_type: userType || undefined,
    })
  }

  const [coldStart, setColdStart] = useState(false)
  useEffect(() => {
    if (!signup.isPending) {
      setColdStart(false)
      return
    }
    const t = setTimeout(() => setColdStart(true), 5000)
    return () => clearTimeout(t)
  }, [signup.isPending])

  return (
    <div className="flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Create your account</h1>
          <p className="text-white/50 text-sm">Free forever. No credit card required.</p>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-6 sm:p-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {signup.isError && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{(signup.error as Error)?.message ?? "Something went wrong"}</span>
              </div>
            )}

            {coldStart && signup.isPending && (
              <div className="flex items-start gap-2 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-xl px-4 py-3 text-[#FFD700] text-sm">
                <Clock size={16} className="mt-0.5 shrink-0" />
                <div className="leading-relaxed">
                  <p className="font-medium">Waking up the server...</p>
                  <p className="text-[#FFD700]/80 text-xs mt-0.5">
                    The backend is hosted on Render's free tier and sleeps when idle. First request takes ~30 seconds. Hang tight.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white/80">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="w-full bg-[#0F0F0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FFD700]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-white/80">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full bg-[#0F0F0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FFD700]/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white/80">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-[#0F0F0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FFD700]/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white/80">
                Password <span className="text-white/30 text-xs">(min 6 chars)</span>
              </label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-[#0F0F0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FFD700]/50 transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3 text-white/80">I am a...</label>
              <div className="flex flex-wrap gap-2">
                {userTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setUserType(type.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      userType === type.value
                        ? "bg-[#FFD700] text-black border-[#FFD700]"
                        : "border-white/10 text-white/60 hover:border-[#FFD700]/40 hover:text-white"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={signup.isPending}
              className="w-full py-3.5 bg-[#FFD700] text-black font-semibold rounded-xl hover:bg-[#e6c200] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {signup.isPending && <Loader2 size={16} className="animate-spin" />}
              {signup.isPending ? "Creating account..." : "Create Account"}
            </button>

            <p className="text-white/30 text-xs text-center">
              By signing up you agree to our{" "}
              <a href="#" className="text-[#FFD700]/70 hover:underline">Terms of Service</a> and{" "}
              <a href="#" className="text-[#FFD700]/70 hover:underline">Privacy Policy</a>.
            </p>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-[#FFD700] hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
