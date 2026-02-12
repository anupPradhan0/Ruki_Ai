import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/contact')({
  component: ContactPage,
})

function ContactPage() {
  return (
    <div className="container">
      <h1>Contact Us</h1>
      <p>Migrate content from views/contact.ejs</p>
    </div>
  )
}
