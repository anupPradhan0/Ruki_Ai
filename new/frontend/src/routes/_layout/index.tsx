import { createFileRoute } from "@tanstack/react-router"
import HeroSection from "@/components/sections/HeroSection"
import FeaturesSection from "@/components/sections/FeaturesSection"
import HowItWorksSection from "@/components/sections/HowItWorksSection"
import AISpotlightSection from "@/components/sections/AISpotlightSection"
import SecuritySection from "@/components/sections/SecuritySection"
import TestimonialsSection from "@/components/sections/TestimonialsSection"
import CTASection from "@/components/sections/CTASection"

export const Route = createFileRoute("/_layout/")({
  component: HomePage,
})

function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <AISpotlightSection />
      <HowItWorksSection />
      <SecuritySection />
      <TestimonialsSection />
      <CTASection />
    </>
  )
}
