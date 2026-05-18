import { cn } from "@/lib/utils"

// Base block: a pulsing rounded panel sized by the parent / className.
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-white/5 rounded-md", className)} />
}

// Helper that forwards inline style — needed because Skeleton doesn't accept it.
// Keeps the shapes below clean.
function Bar({
  height = 12,
  width = "100%",
  className,
}: {
  height?: number
  width?: string
  className?: string
}) {
  return (
    <div
      className={cn("animate-pulse bg-white/5 rounded-md", className)}
      style={{ height, width }}
    />
  )
}

export function SkeletonCard({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <section className={cn("bg-[#1A1A1A] border border-white/5 rounded-2xl p-6", className)}>
      <Bar height={14} width="40%" className="mb-4" />
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Bar
            key={i}
            height={12}
            width={`${100 - i * 12}%`}
          />
        ))}
      </div>
    </section>
  )
}

export function SkeletonStatGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-[#0F0F0F]/60 border border-white/5 rounded-xl p-4">
          <Bar height={10} width="50%" className="mb-2" />
          <Bar height={14} width="80%" />
        </div>
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      {/* AI Advice card */}
      <section className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6">
        <Bar height={14} width="30%" className="mb-5" />
        <div className="space-y-2.5">
          <Bar height={12} width="95%" />
          <Bar height={12} width="88%" />
          <Bar height={12} width="92%" />
          <Bar height={12} width="70%" />
        </div>
      </section>

      {/* Stat-grid card */}
      <section className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6">
        <Bar height={14} width="25%" className="mb-4" />
        <SkeletonStatGrid count={6} />
      </section>

      {/* Goals card */}
      <section className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 space-y-4">
        <Bar height={14} width="30%" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-2">
              <Bar height={12} width="35%" />
              <Bar height={12} width="20%" />
            </div>
            <Bar height={8} className="rounded-full" />
          </div>
        ))}
      </section>
    </div>
  )
}

export function SettingsInfoSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-[#111] border border-white/5 rounded-xl px-5 py-4">
          <Bar height={10} width="20%" className="mb-2" />
          <Bar height={14} width="60%" />
        </div>
      ))}
    </div>
  )
}

export function SettingsAiSkeleton() {
  return (
    <div className="space-y-6">
      <Bar height={14} width="80%" />

      <div className="space-y-2">
        <Bar height={10} width="15%" />
        <div className="grid sm:grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#111] border border-white/10 rounded-xl px-4 py-3"
            >
              <Bar height={14} width="40%" className="mb-2" />
              <Bar height={10} width="60%" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Bar height={10} width="10%" />
        <Bar height={40} className="rounded-xl" />
      </div>
    </div>
  )
}

export function SettingsSecuritySkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Bar height={10} width="20%" className="mb-2" />
        <div className="bg-[#111] border border-white/5 rounded-xl p-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/5 animate-pulse" />
          <div className="flex-1 space-y-2">
            <Bar height={12} width="55%" />
            <Bar height={10} width="40%" />
          </div>
        </div>
      </div>

      <div>
        <Bar height={10} width="25%" className="mb-2" />
        <div className="bg-[#111] border border-white/5 rounded-xl p-5 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Bar height={10} width="30%" className="mb-2" />
              <Bar height={40} className="rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ConversationListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-lg">
          <div className="w-3 h-3 rounded bg-white/5 animate-pulse" />
          <Bar height={10} width={`${80 - (i % 3) * 15}%`} />
        </div>
      ))}
    </div>
  )
}

export function MoneyOverviewSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <SkeletonStatGrid count={3} />
      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6">
          <Bar height={14} width="40%" className="mb-4" />
          <Bar height={180} className="rounded-xl" />
        </section>
        <section className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6">
          <Bar height={14} width="40%" className="mb-4" />
          <Bar height={180} className="rounded-xl" />
        </section>
      </div>
    </div>
  )
}

export function TxnListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between bg-[#111] border border-white/5 rounded-xl px-4 py-3"
        >
          <div className="flex-1 space-y-2">
            <Bar height={12} width="35%" />
            <Bar height={10} width="20%" />
          </div>
          <Bar height={14} width="80px" />
        </div>
      ))}
    </div>
  )
}

export function ChatHistorySkeleton() {
  // Alternating user / assistant bubbles to match the eventual layout.
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex justify-end">
        <div className="max-w-[85%] w-72 bg-[#FFD700]/10 rounded-2xl rounded-tr-md px-4 py-3 space-y-2">
          <Bar height={10} width="80%" />
          <Bar height={10} width="60%" />
        </div>
      </div>
      <div className="flex gap-3">
        <div className="w-7 h-7 rounded-lg bg-white/5 animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <Bar height={10} width="95%" />
          <Bar height={10} width="88%" />
          <Bar height={10} width="70%" />
          <Bar height={10} width="40%" />
        </div>
      </div>
      <div className="flex justify-end">
        <div className="max-w-[85%] w-56 bg-[#FFD700]/10 rounded-2xl rounded-tr-md px-4 py-3 space-y-2">
          <Bar height={10} width="70%" />
        </div>
      </div>
      <div className="flex gap-3">
        <div className="w-7 h-7 rounded-lg bg-white/5 animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <Bar height={10} width="92%" />
          <Bar height={10} width="80%" />
          <Bar height={10} width="55%" />
        </div>
      </div>
    </div>
  )
}
