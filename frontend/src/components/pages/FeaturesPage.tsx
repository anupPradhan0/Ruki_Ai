import FeaturesSection from "@/components/sections/FeaturesSection"
import { TrendingUp } from "lucide-react"

const detailedFeatures = [
  {
    icon: "📊",
    title: "Smart Expense Tracking",
    tagline: "Capture every penny with precision",
    points: [
      "Auto-categorize expenses (Food / Transport / Bills)",
      "Log amount, description, date & payment method",
      "Visual spending timeline with trend indicators",
    ],
  },
  {
    icon: "🧠",
    title: "AI Spending Analysis",
    tagline: "Understand your habits before they control you",
    points: [
      "Weekly & monthly trend heatmaps",
      "Predictive spending forecasts",
      "Anomaly detection for unusual charges",
    ],
  },
  {
    icon: "🎯",
    title: "Goal-Based Budgets",
    tagline: "Save for what matters most",
    points: [
      "Set savings goals with target dates",
      "Auto-split income into goal buckets",
      "Real-time progress tracking",
    ],
  },
  {
    icon: "🔔",
    title: "Smart Notifications",
    tagline: "Stay informed without information overload",
    points: [
      "Overspend alerts before you breach limits",
      "Bill due date reminders",
      "Weekly AI digest of your financial health",
    ],
  },
]

export default function FeaturesPage() {
  return (
    <>
      <section className="pt-20 pb-10 px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-full px-4 py-1.5 text-[#FFD700] text-sm font-medium mb-6">
            <TrendingUp size={16} /> All Features
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-5">
            Key <span className="text-[#FFD700]">Features</span>
          </h1>
          <p className="text-white/50 text-lg">
            Discover how our AI-powered finance tracker transforms your relationship with money.
          </p>
        </div>
      </section>

      {/* Detailed feature cards */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
          {detailedFeatures.map(({ icon, title, tagline, points }) => (
            <div
              key={title}
              className="bg-[#1A1A1A] rounded-2xl p-7 border border-white/5 hover:border-[#FFD700]/20 transition-all"
            >
              <div className="text-3xl mb-4">{icon}</div>
              <h3 className="text-xl font-semibold mb-1">{title}</h3>
              <p className="text-[#FFD700] text-sm mb-5 italic">"{tagline}"</p>
              <ul className="space-y-2">
                {points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2 text-white/60 text-sm">
                    <span className="text-[#FFD700] mt-0.5">✓</span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <FeaturesSection />
    </>
  )
}
