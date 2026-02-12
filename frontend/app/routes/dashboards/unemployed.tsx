import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboards/unemployed')({
  component: DashboardsUnemployedPage,
})

function DashboardsUnemployedPage() {
  return (
    <div>
      <h1>Unemployed Dashboard</h1>
      <p>Dashboard content for unemployed users (migrate from views/dashboards/unemployed.ejs).</p>
    </div>
  )
}
