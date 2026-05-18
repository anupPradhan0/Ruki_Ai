import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router"

const TABS: { to: "/dashboard/money" | "/dashboard/money/transactions" | "/dashboard/money/budget"; label: string; exact?: boolean }[] = [
  { to: "/dashboard/money", label: "Overview", exact: true },
  { to: "/dashboard/money/transactions", label: "Transactions" },
  { to: "/dashboard/money/budget", label: "Budget" },
]

function MoneyLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname })
  return (
    <>
      <div className="border-b border-white/5 bg-[#0F0F0F]/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const active = tab.exact ? path === tab.to : path.startsWith(tab.to)
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "text-white border-[#FFD700]"
                    : "text-white/50 border-transparent hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
      <Outlet />
    </>
  )
}

export const Route = createFileRoute("/dashboard/money")({
  component: MoneyLayout,
})
