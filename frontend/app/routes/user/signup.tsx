import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/user/signup')({
  component: UserSignupPage,
})

function UserSignupPage() {
  return (
    <div className="container">
      <h1>Sign Up Free</h1>
      <p>Migrate content from views/signup.ejs</p>
    </div>
  )
}
