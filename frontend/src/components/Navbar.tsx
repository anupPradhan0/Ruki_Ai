import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Features", to: "/features" },
  { label: "How It Works", to: "/how-it-works" },
  { label: "About", to: "/about" },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-[rgba(15,15,15,0.95)] backdrop-blur-md border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold tracking-tight">
            Ruki<span className="text-[#FFD700]">AI</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="nav-underline text-white/80 hover:text-white font-medium transition-colors text-sm"
                activeProps={{ className: "text-[#FFD700]" }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg border border-white/20 text-sm font-medium text-white hover:border-[#FFD700] hover:text-[#FFD700] transition-all"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 rounded-lg bg-[#FFD700] text-black text-sm font-semibold hover:bg-[#e6c200] transition-all"
            >
              Sign Up Free
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-300",
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-4 pt-2 pb-6 flex flex-col gap-4 bg-[#0F0F0F] border-t border-white/5">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-white/80 hover:text-[#FFD700] font-medium py-1 transition-colors"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
            <Link
              to="/login"
              className="py-2.5 rounded-lg border border-white/20 text-center text-sm font-medium text-white hover:border-[#FFD700] hover:text-[#FFD700] transition-all"
              onClick={() => setOpen(false)}
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="py-2.5 rounded-lg bg-[#FFD700] text-center text-black text-sm font-semibold hover:bg-[#e6c200] transition-all"
              onClick={() => setOpen(false)}
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
