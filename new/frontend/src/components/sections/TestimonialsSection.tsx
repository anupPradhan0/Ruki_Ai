const testimonials = [
  {
    quote:
      "The AI caught my UberEats addiction and suggested alternatives. I've saved over $300/month without feeling deprived. The spending heatmaps were an eye-opener!",
    name: "Sarah Johnson",
    role: "Freelance Designer, NYC",
    avatar: "SJ",
  },
  {
    quote:
      "RukiAI helped me build an emergency fund in 4 months. The personalized advice for students is incredibly practical and actually works with a tight budget.",
    name: "Arjun Mehta",
    role: "Engineering Student, Mumbai",
    avatar: "AM",
  },
  {
    quote:
      "As a freelancer, my income varies every month. RukiAI adapted to my cash flow patterns and gave me advice that actually made sense for my situation.",
    name: "Priya Sharma",
    role: "Freelance Writer, Bangalore",
    avatar: "PS",
  },
]

export default function TestimonialsSection() {
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            User <span className="text-[#FFD700]">Success Stories</span>
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Real people. Real savings. Real results.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map(({ quote, name, role, avatar }) => (
            <div
              key={name}
              className="bg-[#1A1A1A] rounded-2xl p-6 border border-white/5 flex flex-col gap-5"
            >
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-[#FFD700] text-sm">★</span>
                ))}
              </div>
              <p className="text-white/70 text-sm leading-relaxed flex-1">"{quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FFD700]/20 border border-[#FFD700]/30 flex items-center justify-center text-[#FFD700] text-xs font-bold">
                  {avatar}
                </div>
                <div>
                  <p className="font-semibold text-sm">{name}</p>
                  <p className="text-white/40 text-xs">{role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
