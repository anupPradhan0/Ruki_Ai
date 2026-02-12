import { Link } from '@tanstack/react-router'
import { useState } from 'react'

export function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/features', label: 'Features' },
    { to: '/how-it-works', label: 'How It Works' },
    { to: '/about', label: 'About' },
  ]

  return (
    <header>
      <div className="container">
        <nav className="navbar">
          <Link to="/" className="logo">
            Ruki<span>AI</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="nav-links">
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to}>
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="auth-buttons">
            <Link to="/user/login" className="btn btn-outline">
              Log In
            </Link>
            <Link to="/user/signup" className="btn btn-primary">
              Sign Up Free
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="mobile-menu-toggle"
            id="mobileMenuToggle"
            aria-label="Toggle navigation"
            onClick={() => setMobileNavOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </nav>
      </div>

      {/* Mobile Navigation Panel */}
      <div className={`mobile-nav ${mobileNavOpen ? 'open' : ''}`} id="mobileNav">
        <div className="mobile-nav-links">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileNavOpen(false)}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="mobile-auth-buttons">
          <Link to="/user/login" className="btn btn-outline" onClick={() => setMobileNavOpen(false)}>
            Log In
          </Link>
          <Link to="/user/signup" className="btn btn-primary" onClick={() => setMobileNavOpen(false)}>
            Sign Up Free
          </Link>
        </div>
      </div>

      {/* Overlay for mobile menu */}
      <div
        className="overlay"
        id="overlay"
        role="presentation"
        aria-hidden="true"
        onClick={() => setMobileNavOpen(false)}
      />
    </header>
  )
}
