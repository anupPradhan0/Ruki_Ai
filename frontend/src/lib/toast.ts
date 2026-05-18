// Tiny imperative toast store. Components subscribe via `useToasts` and
// anywhere in the codebase can call `toast.error("...")`.

export type ToastKind = "error" | "success" | "info"

export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
  createdAt: number
}

type Listener = (toasts: ToastItem[]) => void

const listeners = new Set<Listener>()
let toasts: ToastItem[] = []
let nextId = 1

const DEFAULT_TTL_MS = 5000

function emit() {
  // Hand each listener its own array to avoid accidental mutation downstream.
  const snapshot = toasts.slice()
  for (const l of listeners) l(snapshot)
}

function push(kind: ToastKind, message: string, ttlMs = DEFAULT_TTL_MS): number {
  if (!message) return 0
  const id = nextId++
  toasts = [...toasts, { id, kind, message, createdAt: Date.now() }]
  emit()
  if (ttlMs > 0) {
    window.setTimeout(() => dismiss(id), ttlMs)
  }
  return id
}

function dismiss(id: number) {
  const before = toasts.length
  toasts = toasts.filter((t) => t.id !== id)
  if (toasts.length !== before) emit()
}

function clear() {
  if (toasts.length === 0) return
  toasts = []
  emit()
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  // Hand the current state immediately so consumers don't render with []
  // before the next push.
  listener(toasts.slice())
  return () => {
    listeners.delete(listener)
  }
}

export const toast = {
  error: (msg: string, ttlMs?: number) => push("error", msg, ttlMs),
  success: (msg: string, ttlMs?: number) => push("success", msg, ttlMs),
  info: (msg: string, ttlMs?: number) => push("info", msg, ttlMs),
  dismiss,
  clear,
}

// Convenience: turn anything thrown by an API call into an error toast.
// Pass a fallback for non-Error rejections so the user always sees something.
export function toastError(err: unknown, fallback = "Something went wrong") {
  const message =
    err instanceof Error && err.message
      ? err.message
      : typeof err === "string" && err
        ? err
        : fallback
  toast.error(message)
}
