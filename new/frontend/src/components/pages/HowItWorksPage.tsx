import HowItWorksSection from "@/components/sections/HowItWorksSection"
import CTASection from "@/components/sections/CTASection"

export default function HowItWorksPage() {
  return (
    <>
      <section className="pt-20 pb-10 px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold mb-5">
            How It <span className="text-[#FFD700]">Works</span>
          </h1>
          <p className="text-white/50 text-lg">
            From sign-up to savings — here's exactly what happens when you join RukiAI.
          </p>
        </div>
      </section>
      <HowItWorksSection />
      <CTASection />
    </>
  )
}
