import CTASection from "@/components/sections/CTASection"


export default function AboutPage() {
  return (
    <>
      <section className="pt-20 pb-12 px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold mb-5">
            About <span className="text-[#FFD700]">RukiAI</span>
          </h1>
          <p className="text-white/50 text-lg leading-relaxed">
            We built RukiAI because managing money shouldn't require a finance degree.
            Our mission is to make AI-powered financial guidance accessible to everyone —
            students, freelancers, employees, and retirees alike.
          </p>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 bg-[#111111]">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            { label: "Founded", value: "2025" },
            { label: "Built By", value: "1 Dev" },
            { label: "AI Providers", value: "5" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#1A1A1A] rounded-2xl p-8 border border-white/5">
              <div className="text-3xl font-bold text-[#FFD700] mb-2">{value}</div>
              <div className="text-white/50 text-sm">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            Our <span className="text-[#FFD700]">Mission</span>
          </h2>
          <div className="bg-[#1A1A1A] rounded-3xl p-8 sm:p-12 border border-white/5">
            <p className="text-white/70 text-lg leading-relaxed text-center max-w-2xl mx-auto">
              At RukiAI, we believe every rupee deserves to work for you. We combine
              cutting-edge AI with behavioral science to deliver advice that's not just
              smart — it's personal. No generic tips. No cookie-cutter budgets.
              Just real insight built around your real life.
            </p>
          </div>
        </div>
      </section>

      {/* Builder section */}
      <section className="py-20 px-4 sm:px-6 bg-[#111111]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            The Person <span className="text-[#FFD700]">Behind RukiAI</span>
          </h2>
          <div className="bg-[#1A1A1A] rounded-3xl border border-white/5 p-8 sm:p-12 flex flex-col sm:flex-row items-center gap-8">
            <div className="w-24 h-24 rounded-full bg-[#FFD700]/10 border-2 border-[#FFD700]/30 flex items-center justify-center shrink-0">
              <span className="text-3xl font-bold text-[#FFD700]">AP</span>
            </div>
            <div className="text-center sm:text-left">
              <h3 className="text-2xl font-bold mb-1">Anup Pradhan</h3>
              <p className="text-[#FFD700] font-medium mb-4">Software Developer</p>
              <p className="text-white/60 leading-relaxed">
                I built RukiAI from the ground up — every line of code, every feature, every design decision.
                My goal was simple: create a finance tool that actually understands how real people spend money
                and gives them advice that fits their life, not a generic spreadsheet template.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CTASection />
    </>
  )
}
