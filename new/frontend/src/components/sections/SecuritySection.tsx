import { Lock, Shield, UserCheck } from "lucide-react"

const badges = [
  { icon: Lock, label: "256-bit AES Encryption" },
  { icon: Shield, label: "Zero Data Selling Policy" },
  { icon: UserCheck, label: "Two-Factor Authentication" },
]

export default function SecuritySection() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-[#111111]">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
          Bank-Level <span className="text-[#FFD700]">Security</span>
        </h2>
        <p className="text-white/50 max-w-xl mx-auto mb-12">
          Your trust is our top priority. RukiAI safeguards your financial data with advanced encryption and strict privacy measures.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-6">
          {badges.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex-1 max-w-xs mx-auto bg-[#1A1A1A] rounded-2xl p-8 border border-white/5 flex flex-col items-center gap-4"
            >
              <div className="w-14 h-14 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
                <Icon className="text-[#FFD700]" size={24} />
              </div>
              <p className="font-medium text-sm text-white/80">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
