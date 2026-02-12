import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboards/retired')({
  component: DashboardsRetiredPage,
})

function DashboardsRetiredPage() {
  return (
    <div>
      <h1>Retired Dashboard</h1>
      <p>Dashboard content for retired users (migrate from views/dashboards/retired.ejs).</p>
    </div>
  )
}
