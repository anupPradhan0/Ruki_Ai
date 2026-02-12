import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboards/employed')({
  component: DashboardsEmployedPage,
})

function DashboardsEmployedPage() {
  return (
    <div>
      <h1>Employed Dashboard</h1>
      <p>Dashboard content for employed users (migrate from views/dashboards/employed.ejs).</p>
    </div>
  )
}
