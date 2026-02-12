import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/user/guest')({
  component: UserGuestPage,
})

function UserGuestPage() {
  return (
    <div className="container">
      <h1>See Demo</h1>
      <p>Guest / demo flow — migrate from views/userType/guest.ejs or redirect to dashboard.</p>
    </div>
  )
}
