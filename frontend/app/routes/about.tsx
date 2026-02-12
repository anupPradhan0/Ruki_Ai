import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  return (
    <div className="container">
      <h1>About RukiAI</h1>
      <p>Migrate content from views/about.ejs</p>
    </div>
  )
}
