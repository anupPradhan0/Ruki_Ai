import { Link } from "@tanstack/react-router"
import { Sparkles } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="flex items-center justify-center px-4 py-24">
      <div className="w-full max-w-md text-center">
        <div className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-10">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#FFD700]/10 flex items-center justify-center mb-6">
            <Sparkles className="text-[#FFD700]" size={26} />
          </div>

          <h1 className="text-2xl font-bold mb-3">Dashboard — Coming Soon</h1>
          <p className="text-white/50 text-sm mb-8">
            Thanks for telling us about yourself. Your personalized dashboard with
            AI-powered insights is on the way.
          </p>

          <Link
            to="/"
            className="inline-block py-3 px-6 bg-[#FFD700] text-black font-semibold rounded-xl hover:bg-[#e6c200] transition-all"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
