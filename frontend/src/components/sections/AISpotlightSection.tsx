import { Bot } from "lucide-react"

export default function AISpotlightSection() {
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#161616] rounded-3xl border border-white/5 p-8 sm:p-12 flex flex-col lg:flex-row gap-10 items-center">
          {/* Text */}
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-full px-4 py-1.5 text-[#FFD700] text-sm font-medium mb-6">
              <Bot size={16} /> AI-Powered Insights
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-5 leading-tight">
              RukiAI Doesn't Just Track —<br className="hidden sm:block" />
              It <span className="text-[#FFD700]">Understands</span>
            </h2>
            <p className="text-white/50 leading-relaxed mb-4">
              Our advanced algorithms analyze your habits, detect patterns, and deliver clear, actionable advice right when you need it.
            </p>
            <p className="text-white/50 leading-relaxed">
              Over time, RukiAI learns your lifestyle and adapts its recommendations — ensuring every tip is smarter, more relevant, and perfectly aligned with your goals.
            </p>
          </div>

          {/* AI alert bubble */}
          <div className="flex-1 flex items-center justify-center w-full">
            <div className="bg-[#0F0F0F] border border-[#FFD700]/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
                  <Bot className="text-[#FFD700]" size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold">RukiAI Alert</p>
                  <p className="text-white/40 text-xs">Just now</p>
                </div>
                <span className="ml-auto w-2.5 h-2.5 rounded-full bg-[#FFD700] animate-pulse" />
              </div>
              <p className="text-white/70 text-sm leading-relaxed bg-[#1A1A1A] rounded-xl p-4">
                💬 "You've spent ₹4,800 on dining this week. Swap 3 takeout meals for home-cooked dishes and save an extra{" "}
                <span className="text-[#FFD700] font-semibold">₹1,200</span> this month."
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="py-2 text-xs rounded-lg bg-[#FFD700] text-black font-semibold hover:bg-[#e6c200] transition-all">
                  Apply Tip
                </button>
                <button className="py-2 text-xs rounded-lg border border-white/10 text-white/60 hover:border-white/30 transition-all">
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
