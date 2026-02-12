import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboards/guest')({
  component: DashboardsGuestPage,
})

function DashboardsGuestPage() {
  return (
    <div>
      <h1>Guest Dashboard</h1>
      <p>Dashboard content for guest users (migrate from views/dashboards/guest.ejs).</p>
    </div>
  )
}
