import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboards/student')({
  component: DashboardsStudentPage,
})

function DashboardsStudentPage() {
  return (
    <div>
      <h1>Student Dashboard</h1>
      <p>Dashboard content for student users (migrate from views/dashboards/student.ejs).</p>
    </div>
  )
}
