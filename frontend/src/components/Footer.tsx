import { Link } from "@tanstack/react-router"

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#0a0a0a] mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="sm:col-span-2 md:col-span-2">
            <h3 className="text-2xl font-bold mb-3">
              Ruki<span className="text-[#FFD700]">AI</span>
            </h3>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              Your personal AI finance assistant. Making money management simple, smart, and secure since 2025.
            </p>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">Company</h4>
            <ul className="space-y-2 text-sm text-white/50">
              <li><Link to="/about" className="hover:text-[#FFD700] transition-colors">About Us</Link></li>
              <li><a href="#" className="hover:text-[#FFD700] transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-[#FFD700] transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-[#FFD700] transition-colors">Press</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">Resources</h4>
            <ul className="space-y-2 text-sm text-white/50">
              <li><a href="#" className="hover:text-[#FFD700] transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-[#FFD700] transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#FFD700] transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-[#FFD700] transition-colors">Security</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-10 pt-6 text-center text-white/30 text-sm">
          &copy; 2025 RukiAI. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
