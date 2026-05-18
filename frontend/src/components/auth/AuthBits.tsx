import { useEffect, useState } from "react"
import { AlertCircle, Clock, Eye, EyeOff } from "lucide-react"

// `text-base sm:text-sm` keeps the field readable on desktop but forces
// 16px on mobile — anything smaller triggers iOS Safari's zoom-on-focus
// which jolts the layout every time the user taps a field.
const inputCls =
  "w-full bg-[#0F0F0F] border border-white/10 rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FFD700]/50 transition-colors"

type FieldProps = {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  type?: "text" | "email" | "password"
  hint?: React.ReactNode
  minLength?: number
}

export function AuthInput({ label, value, onChange, placeholder, required, type = "text", hint, minLength }: FieldProps) {
  const [show, setShow] = useState(false)
  const isPassword = type === "password"
  const inputType = isPassword ? (show ? "text" : "password") : type
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-white/80">
        {label}
        {hint && <span className="text-white/30 text-xs ml-1">{hint}</span>}
      </label>
      <div className={isPassword ? "relative" : ""}>
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? (isPassword ? "••••••••" : undefined)}
          required={required}
          minLength={minLength}
          className={isPassword ? `${inputCls} pr-12` : inputCls}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  )
}

export function AuthErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export function ColdStartBanner() {
  return (
    <div className="flex items-start gap-2 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-xl px-4 py-3 text-[#FFD700] text-sm">
      <Clock size={16} className="mt-0.5 shrink-0" />
      <div className="leading-relaxed">
        <p className="font-medium">Waking up the server...</p>
        <p className="text-[#FFD700]/80 text-xs mt-0.5">
          The backend is hosted on Render's free tier and sleeps when idle. First request takes ~30 seconds. Hang tight.
        </p>
      </div>
    </div>
  )
}

// Flips to true after `delay` ms while `pending` is true; resets when pending falls.
export function useColdStart(pending: boolean, delay = 5000) {
  const [cold, setCold] = useState(false)
  useEffect(() => {
    if (!pending) return setCold(false)
    const t = setTimeout(() => setCold(true), delay)
    return () => clearTimeout(t)
  }, [pending, delay])
  return cold
}
