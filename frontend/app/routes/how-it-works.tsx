import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/how-it-works')({
  component: HowItWorksPage,
})

function HowItWorksPage() {
  return (
    <div className="container">
      <h1>How It Works</h1>
      <p>Migrate content from views/how-it-works.ejs</p>
    </div>
  )
}
