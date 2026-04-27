import { Link } from "@tanstack/react-router"
import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const [show, setShow] = useState(false)

  return (
    <div className="flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
          <p className="text-white/50 text-sm">Log in to your RukiAI account</p>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-8">
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
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

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-white/50 cursor-pointer">
                <input type="checkbox" className="accent-[#FFD700]" />
                Remember me
              </label>
              <a href="#" className="text-[#FFD700] hover:underline">Forgot password?</a>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#FFD700] text-black font-semibold rounded-xl hover:bg-[#e6c200] transition-all"
            >
              Log In
            </button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-[#FFD700] hover:underline font-medium">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
