import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Menu, X } from "lucide-react";

/* ── Geometric asterisk/starburst SVG mark (no Brain icon) ── */
const AsteriskMark = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <line x1="14" y1="2" x2="14" y2="26" stroke="#0071E3" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="2" y1="14" x2="26" y2="14" stroke="#0071E3" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="4.93" y1="4.93" x2="23.07" y2="23.07" stroke="#0071E3" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="23.07" y1="4.93" x2="4.93" y2="23.07" stroke="#0071E3" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const NAV_LINKS = [
  { label: "Features",     href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Benefits",     href: "#benefits" },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  /* Detect scroll to toggle glassmorphism ─────────────────── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Close mobile menu on link click ───────────────────────── */
  const handleNavClick = (href: string) => {
    setIsMenuOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "glass border-b border-white/[0.08] py-3"
            : "bg-transparent border-b border-transparent py-5"
        }`}
        style={{ fontFamily: "var(--font-body)" }}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* ── Logo ──────────────────────────────────────── */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 group outline-none"
            aria-label="MinutesAI home"
          >
            <AsteriskMark />
            <span
              className="text-[1.125rem] font-semibold tracking-tight transition-colors"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              MinutesAI
            </span>
          </button>

          {/* ── Desktop Nav ───────────────────────────────── */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="text-sm font-medium transition-colors duration-150"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* ── Desktop CTA ───────────────────────────────── */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="btn-ghost text-sm py-2 px-5"
                >
                  Dashboard
                </button>
                <button
                  onClick={logout}
                  className="btn-accent text-sm py-2 px-5"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/auth")}
                  className="btn-ghost text-sm py-2 px-5"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate("/auth")}
                  className="btn-accent text-sm py-2 px-5"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* ── Mobile Hamburger ──────────────────────────── */}
          <button
            className="md:hidden p-2 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: "var(--text-secondary)" }}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen
              ? <X className="w-5 h-5" />
              : <Menu className="w-5 h-5" />
            }
          </button>
        </div>
      </header>

      {/* ── Mobile full-screen overlay ────────────────────── */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${
          isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0"
          style={{ background: "rgba(15,16,18,0.96)", backdropFilter: "blur(20px)" }}
          onClick={() => setIsMenuOpen(false)}
        />

        {/* Menu panel — slides down */}
        <div
          className={`relative z-10 flex flex-col px-8 pt-28 pb-12 gap-2 transition-all duration-300 ${
            isMenuOpen ? "translate-y-0" : "-translate-y-4"
          }`}
        >
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => handleNavClick(link.href)}
              className="text-left text-2xl font-semibold py-3 border-b transition-colors duration-150"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--text-secondary)",
                borderColor: "var(--border-subtle)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
            >
              {link.label}
            </button>
          ))}

          <div className="flex flex-col gap-3 pt-8">
            {isAuthenticated ? (
              <>
                <button onClick={() => { navigate("/dashboard"); setIsMenuOpen(false); }} className="btn-ghost w-full justify-center">
                  Dashboard
                </button>
                <button onClick={() => { logout(); setIsMenuOpen(false); }} className="btn-accent w-full justify-center">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { navigate("/auth"); setIsMenuOpen(false); }} className="btn-ghost w-full justify-center">
                  Sign In
                </button>
                <button onClick={() => { navigate("/auth"); setIsMenuOpen(false); }} className="btn-accent w-full justify-center">
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;