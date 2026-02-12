import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { ReviewButton } from '~/components/ReviewButton'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="hero mobile-hero">
        <div className="container mobile-container">
          <div className="hero-content-wrapper">
            <div className="hero-content mobile-hero-content">
              <h1 className="mobile-hero-title">Smarter Spending Starts Here</h1>
              <p className="mobile-hero-text">
                Track expenses. Save better. Let RukiAI guide your money moves with smart, AI-driven
                advice.
              </p>
              <div className="hero-cta mobile-cta">
                <Link to="/user/signup" className="btn btn-primary mobile-btn-primary">
                  Get Started Free
                </Link>
                <Link to="/user/guest" className="btn btn-outline mobile-btn-outline">
                  See Demo
                </Link>
              </div>
            </div>

            <div style={{ height: '15px' }} />

            <div className="hero-visual mobile-hero-visual mobile-chart-stack">
              <div className="chart-animation mobile-chart">
                <div className="chart-bar" style={{ ['--bar-height' as string]: '250', ['--mobile-height' as string]: '120' }} />
                <div className="chart-bar" style={{ ['--bar-height' as string]: '180', ['--mobile-height' as string]: '90' }} />
                <div className="chart-bar" style={{ ['--bar-height' as string]: '320', ['--mobile-height' as string]: '150' }} />
                <div className="chart-bar" style={{ ['--bar-height' as string]: '150', ['--mobile-height' as string]: '80' }} />
                <div className="chart-bar" style={{ ['--bar-height' as string]: '280', ['--mobile-height' as string]: '130' }} />
                <div className="chart-bar" style={{ ['--bar-height' as string]: '200', ['--mobile-height' as string]: '100' }} />
                <div className="chart-bar" style={{ ['--bar-height' as string]: '350', ['--mobile-height' as string]: '160' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features mobile-features">
        <div className="container mobile-container">
          <h2 className="section-title mobile-section-title">Smart Finance Management</h2>
          <div className="features-grid mobile-features-grid">
            <div className="feature-card mobile-feature-card">
              <div className="feature-icon mobile-feature-icon">
                <i className="fas fa-chart-line" />
              </div>
              <h3 className="mobile-feature-title">Track Automatically</h3>
              <p className="mobile-feature-text">
                Link your accounts once and let RukiAI do the rest. Every expense is tracked in real
                time and automatically categorized — no manual logging, no missed transactions.
              </p>
            </div>
            <div className="feature-card mobile-feature-card">
              <div className="feature-icon mobile-feature-icon">
                <i className="fas fa-brain" />
              </div>
              <h3 className="mobile-feature-title">Analyze Spending</h3>
              <p className="mobile-feature-text">
                See exactly where your money goes with AI-powered visual insights, heatmaps, and
                spending trend predictions — so you can plan ahead with confidence.
              </p>
            </div>
            <div className="feature-card mobile-feature-card">
              <div className="feature-icon mobile-feature-icon">
                <i className="fas fa-bullseye" />
              </div>
              <h3 className="mobile-feature-title">Optimize Savings</h3>
              <p className="mobile-feature-text">
                Get smart alerts like "Cut dining out this week to save ₹1,200". Receive
                personalized, actionable tips to reduce costs and grow your savings without
                sacrificing what you love.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Spotlight Section */}
      <section className="ai-spotlight mobile-spotlight">
        <div className="container mobile-container">
          <div className="spotlight-container mobile-spotlight-container">
            <div className="spotlight-content mobile-spotlight-content">
              <h2 className="mobile-spotlight-title">🤖 AI-Powered Insights</h2>
              <p className="mobile-spotlight-text">
                RukiAI doesn't just track your spending — it understands it. Our advanced algorithms
                analyze your habits, detect patterns, and deliver clear, actionable advice right when
                you need it.
              </p>
              <p className="mobile-spotlight-text">
                Over time, RukiAI learns your lifestyle and adapts its recommendations, ensuring every
                tip is smarter, more relevant, and perfectly aligned with your financial goals.
              </p>
            </div>
            <div className="notification-preview mobile-notification">
              <div className="notification-bubble mobile-notification-bubble">
                <div className="notification-header mobile-notification-header">
                  <div className="notification-icon mobile-notification-icon">
                    <i className="fas fa-robot" />
                  </div>
                  <div className="notification-title mobile-notification-title">AI Alert</div>
                </div>
                <div className="notification-message mobile-notification-message">
                  💬 "You've spent ₹4,800 on dining this week. Swap 3 takeout meals for home-cooked
                  dishes and save an extra ₹1,200."
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="security mobile-security">
        <div className="container mobile-container">
          <h2 className="section-title mobile-section-title">Bank-Level Security</h2>
          <p className="mobile-security-text">
            Your trust is our top priority. RukiAI safeguards your financial data with advanced
            encryption and strict privacy measures — the same level of protection trusted by global
            banks.
          </p>
          <div className="security-badges mobile-security-badges">
            <div className="badge mobile-badge">
              <div className="badge-icon mobile-badge-icon">
                <i className="fas fa-lock" />
              </div>
              <p className="mobile-badge-text">256-bit AES Encryption</p>
            </div>
            <div className="badge mobile-badge">
              <div className="badge-icon mobile-badge-icon">
                <i className="fas fa-shield-alt" />
              </div>
              <p className="mobile-badge-text">Zero Data Selling Policy</p>
            </div>
            <div className="badge mobile-badge">
              <div className="badge-icon mobile-badge-icon">
                <i className="fas fa-user-shield" />
              </div>
              <p className="mobile-badge-text">Two-Factor Authentication</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials mobile-testimonials">
        <div className="container mobile-container">
          <h2 className="section-title mobile-section-title">User Success Stories</h2>
          <div className="testimonial-container mobile-testimonial-container">
            <div className="testimonial-slide mobile-testimonial">
              <div className="testimonial-content mobile-testimonial-content">
                The AI caught my UberEats addiction and suggested alternatives. I've saved over
                $300/month without feeling deprived. The spending heatmaps were an eye-opener!
              </div>
              <div className="testimonial-author mobile-author">
                <div className="author-avatar mobile-avatar">
                  <i className="fas fa-user" />
                </div>
                <div className="author-info mobile-author-info">
                  <div className="author-name mobile-author-name">Sarah Johnson</div>
                  <div className="author-title mobile-author-title">Freelance Designer, NYC</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ReviewButton />
    </>
  )
}
