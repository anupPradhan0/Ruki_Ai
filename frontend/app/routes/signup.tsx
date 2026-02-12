import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  return (
    <div className="container">
      <h1>Sign Up</h1>
      <p>Migrate content from views/signup.ejs</p>
    </div>
  )
}
