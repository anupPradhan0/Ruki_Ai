const steps = [
  {
    step: "01",
    title: "Create Your Account",
    desc: "Sign up in under 60 seconds. No credit card required. Choose your profile — student, employed, freelancer, or retired.",
  },
  {
    step: "02",
    title: "Connect & Log Expenses",
    desc: "Link your bank accounts or manually log expenses. RukiAI auto-categorizes everything so you never have to sort through transactions.",
  },
  {
    step: "03",
    title: "Get AI Insights",
    desc: "Our AI analyzes your spending patterns and delivers personalized tips, budget recommendations, and alerts right when you need them.",
  },
  {
    step: "04",
    title: "Save More, Stress Less",
    desc: "Watch your savings grow as you follow RukiAI's tailored advice. Track your progress and celebrate every financial milestone.",
  },
]

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 bg-[#111111]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            How It <span className="text-[#FFD700]">Works</span>
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Get started in minutes. RukiAI is designed to be effortless from day one.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connector line — desktop only */}
          <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-[#FFD700]/30 to-transparent" />

          {steps.map(({ step, title, desc }) => (
            <div key={step} className="bg-[#1A1A1A] rounded-2xl p-6 border border-white/5 text-center relative">
              <div className="w-14 h-14 rounded-full border-2 border-[#FFD700] flex items-center justify-center mx-auto mb-5 bg-[#0F0F0F]">
                <span className="text-[#FFD700] font-bold text-lg">{step}</span>
              </div>
              <h3 className="font-semibold text-base mb-3">{title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
