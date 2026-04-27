import { Link } from "@tanstack/react-router"
import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

const userTypes = ["Student", "Employed", "Freelancer", "Retired", "Unemployed"]

export default function SignupPage() {
  const [show, setShow] = useState(false)
  const [selected, setSelected] = useState("")

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold">
            Ruki<span className="text-[#FFD700]">AI</span>
          </Link>
          <h1 className="text-2xl font-bold mt-6 mb-2">Create your account</h1>
          <p className="text-white/50 text-sm">Free forever. No credit card required.</p>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-8">
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white/80">First Name</label>
                <input
                  type="text"
                  placeholder="John"
                  className="w-full bg-[#0F0F0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FFD700]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-white/80">Last Name</label>
                <input
                  type="text"
                  placeholder="Doe"
                  className="w-full bg-[#0F0F0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FFD700]/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white/80">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full bg-[#0F0F0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FFD700]/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white/80">Password</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  placeholder="••••••••"
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
                    key={type}
                    type="button"
                    onClick={() => setSelected(type)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      selected === type
                        ? "bg-[#FFD700] text-black border-[#FFD700]"
                        : "border-white/10 text-white/60 hover:border-[#FFD700]/40 hover:text-white"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#FFD700] text-black font-semibold rounded-xl hover:bg-[#e6c200] transition-all"
            >
              Create Account
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
