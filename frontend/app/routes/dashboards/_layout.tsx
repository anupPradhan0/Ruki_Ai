import { createFileRoute, Outlet } from '@tanstack/react-router'

/**
 * Shared layout for all dashboard types (employed, guest, retired, student, unemployed).
 * Add shared dashboard UI (e.g. sidebar, dashboard header) here.
 */
export const Route = createFileRoute('/dashboards/_layout')({
  component: DashboardsLayout,
})

function DashboardsLayout() {
  return (
    <div className="dashboard-layout">
      <Outlet />
    </div>
  )
}
