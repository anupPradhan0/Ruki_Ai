import { TrendingUp, Brain, Target, Receipt, BarChart2, Bell } from "lucide-react"

const features = [
  {
    icon: Receipt,
    title: "Smart Expense Tracking",
    desc: "Link your accounts once and let RukiAI do the rest. Every expense is tracked in real time and automatically categorized — no manual logging, no missed transactions.",
  },
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    desc: "See exactly where your money goes with AI-powered visual insights, heatmaps, and spending trend predictions — so you can plan ahead with confidence.",
  },
  {
    icon: Target,
    title: "Optimize Savings",
    desc: "Get smart alerts like 'Cut dining out this week to save ₹1,200'. Receive personalized, actionable tips to reduce costs and grow your savings.",
  },
  {
    icon: TrendingUp,
    title: "Spending Trends",
    desc: "Visual timelines and trend graphs help you spot patterns instantly — weekly, monthly, or yearly breakdowns at a glance.",
  },
  {
    icon: BarChart2,
    title: "Budget Planning",
    desc: "Set budgets per category and get notified before you overspend. RukiAI proactively keeps you on track every day.",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    desc: "Real-time push notifications when unusual spending is detected, bills are due, or you're about to exceed a budget threshold.",
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Smart <span className="text-[#FFD700]">Finance Management</span>
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Everything you need to take control of your money — powered by AI.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-[#1A1A1A] rounded-2xl p-6 border border-white/5 hover:border-[#FFD700]/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#FFD700]/10 flex items-center justify-center mb-5 group-hover:bg-[#FFD700]/20 transition-colors">
                <Icon className="text-[#FFD700]" size={22} />
              </div>
              <h3 className="font-semibold text-lg mb-3">{title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
