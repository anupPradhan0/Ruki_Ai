import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/features')({
  component: FeaturesPage,
})

function FeaturesPage() {
  return (
    <div className="container">
      <h1>Features</h1>
      <p>Migrate content from views/features.ejs</p>
    </div>
  )
}
