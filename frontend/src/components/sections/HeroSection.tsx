import { Link } from "@tanstack/react-router"

const BAR_HEIGHTS = [55, 40, 70, 35, 62, 45, 78]

export default function HeroSection() {
  return (
    <section className="pt-20 pb-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Text */}
          <div className="flex-1 text-center lg:text-left animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-full px-4 py-1.5 text-[#FFD700] text-sm font-medium mb-6">
              🤖 AI-Powered Finance Tracker
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Smarter Spending{" "}
              <span className="text-[#FFD700]">Starts Here</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
              Track expenses. Save better. Let RukiAI guide your money moves
              with smart, AI-driven advice tailored to your lifestyle.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                to="/signup"
                className="px-8 py-3.5 bg-[#FFD700] text-black font-semibold rounded-xl hover:bg-[#e6c200] transition-all text-center shadow-lg shadow-[#FFD700]/20"
              >
                Get Started Free
              </Link>
              <a
                href="#features"
                className="px-8 py-3.5 border border-white/20 text-white rounded-xl hover:border-[#FFD700] hover:text-[#FFD700] transition-all text-center"
              >
                See How It Works
              </a>
            </div>
          </div>

          {/* Chart visual */}
          <div className="flex-1 flex items-end justify-center gap-3 h-56 sm:h-64 w-full max-w-xs sm:max-w-sm mx-auto">
            {BAR_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-lg bg-gradient-to-t from-[#FFD700] to-[#FFD700]/40 animate-grow"
                style={{
                  height: `${h}%`,
                  animationDelay: `${i * 0.1}s`,
                  opacity: 0.7 + i * 0.04,
                }}
              />
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { value: "100%", label: "Private by Default" },
            { value: "5", label: "AI Providers" },
            { value: "4", label: "User Types Supported" },
            { value: "Free", label: "& Open Source" },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#1A1A1A] rounded-2xl p-5 text-center border border-white/5">
              <div className="text-2xl font-bold text-[#FFD700] mb-1">{stat.value}</div>
              <div className="text-white/50 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
