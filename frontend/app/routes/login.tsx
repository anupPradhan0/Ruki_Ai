import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="container">
      <h1>Log In</h1>
      <p>Migrate content from views/login.ejs</p>
    </div>
  )
}
