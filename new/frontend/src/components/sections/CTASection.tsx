import { Link } from "@tanstack/react-router"

export default function CTASection() {
  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-5xl font-bold mb-6 leading-tight">
          Ready to Take Control of{" "}
          <span className="text-[#FFD700]">Your Money?</span>
        </h2>
        <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto">
          Join 50,000+ users who are saving smarter with RukiAI. Free forever. No credit card needed.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/signup"
            className="px-10 py-4 bg-[#FFD700] text-black font-semibold rounded-xl hover:bg-[#e6c200] transition-all shadow-lg shadow-[#FFD700]/20 text-center"
          >
            Start Saving Free
          </Link>
          <Link
            to="/login"
            className="px-10 py-4 border border-white/20 text-white rounded-xl hover:border-[#FFD700] hover:text-[#FFD700] transition-all text-center"
          >
            Already have an account?
          </Link>
        </div>
      </div>
    </section>
  )
}
