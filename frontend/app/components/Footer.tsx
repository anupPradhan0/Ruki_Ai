import { Link } from '@tanstack/react-router'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer>
      <div className="container">
        <div className="footer-divider" />

        {/* Desktop Footer */}
        <div className="footer-content desktop-footer">
          <div className="footer-brand">
            <h3>
              Ruki<span style={{ color: '#FFD700' }}>AI</span>
            </h3>
            <p>
              Your personal AI finance assistant. Making money management simple, smart, and secure
              since 2023.
            </p>
          </div>
          <div className="footer-links">
            <h4>Company</h4>
            <ul>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
              <li><Link to="/blog">Blog</Link></li>
              <li><Link to="/press">Press</Link></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Resources</h4>
            <ul>
              <li><Link to="/help">Help Center</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/security">Security</Link></li>
            </ul>
          </div>
        </div>

        {/* Mobile Footer */}
        <div className="footer-content mobile-footer">
          <div className="footer-brand">
            <h3>
              Ruki<span style={{ color: '#FFD700' }}>AI</span>
            </h3>
            <p>
              Your personal AI finance assistant. Making money management simple, smart, and secure
              since {currentYear}.
            </p>
          </div>
          <div className="footer-links-wrapper">
            <div className="footer-links">
              <h4>Company</h4>
              <ul>
                <li><Link to="/about">About Us</Link></li>
                <li><Link to="/contact">Contact Us</Link></li>
                <li><Link to="/blog">Blog</Link></li>
                <li><Link to="/press">Press</Link></li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>Resources</h4>
              <ul>
                <li><Link to="/help">Help Center</Link></li>
                <li><Link to="/privacy">Privacy Policy</Link></li>
                <li><Link to="/terms">Terms of Service</Link></li>
                <li><Link to="/security">Security</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="copyright">
          &copy; {currentYear} RukiAI. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
