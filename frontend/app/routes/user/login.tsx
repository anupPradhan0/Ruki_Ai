import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/user/login')({
  component: UserLoginPage,
})

function UserLoginPage() {
  return (
    <div className="container">
      <h1>Log In</h1>
      <p>Migrate content from views/login.ejs</p>
    </div>
  )
}
