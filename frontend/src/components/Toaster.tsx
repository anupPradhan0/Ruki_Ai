import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react"
import { subscribe, toast, type ToastItem, type ToastKind } from "@/lib/toast"

const KIND_STYLES: Record<ToastKind, { bg: string; border: string; text: string; Icon: typeof AlertCircle }> = {
  error: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-300", Icon: AlertCircle },
  success: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-300", Icon: CheckCircle2 },
  info: { bg: "bg-[#FFD700]/10", border: "border-[#FFD700]/30", text: "text-[#FFD700]", Icon: Info },
}

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => subscribe(setItems), [])

  if (items.length === 0) return null

  return (
    // Bottom-center on mobile, bottom-right on >= sm. The
    // `env(safe-area-inset-bottom)` keeps us above iOS home-bar / Android
    // gesture pill so toasts aren't visually clipped.
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-3 sm:items-end sm:right-4 sm:left-auto sm:px-0"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
      aria-live="polite"
      role="status"
    >
      {items.map((t) => (
        <ToastRow key={t.id} t={t} />
      ))}
    </div>
  )
}

function ToastRow({ t }: { t: ToastItem }) {
  const { bg, border, text, Icon } = KIND_STYLES[t.kind]
  return (
    <div
      className={`pointer-events-auto w-full sm:w-auto sm:max-w-sm min-w-[260px] flex items-start gap-2.5 ${bg} ${border} ${text} border rounded-xl px-3.5 py-3 text-sm shadow-lg backdrop-blur animate-toast-in`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span className="flex-1 leading-snug break-words text-white/90">{t.message}</span>
      <button
        type="button"
        onClick={() => toast.dismiss(t.id)}
        className="shrink-0 -mr-1 -mt-1 p-1 rounded-md text-white/40 hover:text-white hover:bg-white/5 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}
