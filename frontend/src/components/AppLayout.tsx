import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, CalendarDays, Layers, Search as SearchIcon, User, Sun, Moon, CheckSquare } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import SearchOverlay from "@/pages/Search";
import { taskService } from "@/services/taskService";

/* ── Nav items ──────────────────────────────────────────── */
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: CalendarDays,    label: "Meetings",  href: "/meetings"  },
  { icon: Layers,          label: "Series",    href: "/series"    },
  { icon: CheckSquare,     label: "Tasks",     href: "/tasks"     },
  { icon: SearchIcon,      label: "Search",    href: "#search", action: 'search' },
  { icon: User,            label: "Profile",   href: "/profile"   },
] as const;

/* ── App Layout ─────────────────────────────────────────── */
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { isDark, toggle } = useTheme();
  const { user }   = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0);

  // Global CMD+K / CTRL+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch unacknowledged task count for badge
  useEffect(() => {
    taskService.getUnacknowledgedTasks()
      .then((tasks) => setUnacknowledgedCount(tasks.length))
      .catch(() => {});
  }, [location.pathname]);

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + "/");

  return (
    <div
      className="min-h-screen relative"
      style={{ background: "var(--bg)", color: "var(--text-primary)" }}
    >
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* ── Dark/Light toggle — fixed top-right ────────── */}
      <button
        onClick={toggle}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className="fixed top-5 right-5 z-40 w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 hover-scale"
        style={{
          background: "var(--surface-raised)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-secondary)",
        }}
      >
        {isDark
          ? <Sun  className="w-4 h-4" />
          : <Moon className="w-4 h-4" />
        }
      </button>

      {/* ── Page content (padded at bottom for pill nav) ─ */}
      <main className="pb-32 pt-6 min-h-screen">
        {children}
      </main>

      {/* ── Floating Pill Nav ────────────────────────────── */}
      <nav
        aria-label="App navigation"
        className="fixed z-40 left-1/2 -translate-x-1/2 bottom-7"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <div
          className="flex items-center gap-1 px-2 py-2 glass"
          style={{
            borderRadius: "var(--radius-pill)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          {NAV_ITEMS.map(({ icon: Icon, label, href, action }) => {
            const active = action ? isSearchOpen : isActive(href);
            /* Profile shows user avatar initial when available */
            const isProfile = href === "/profile";
            const initial   = isProfile && user?.name ? user.name[0].toUpperCase() : null;

            return (
              <button
                key={label}
                onClick={() => {
                  if (action === 'search') {
                    setIsSearchOpen(true);
                  } else {
                    navigate(href);
                  }
                }}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                title={label}
                className="relative flex items-center justify-center w-11 h-11 rounded-pill transition-all duration-200 group"
                style={{
                  background: active ? "#0071E3" : "transparent",
                  transform: active ? "scale(1)" : "scale(0.95)",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.transform = "scale(1.08)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.transform = active ? "scale(1)" : "scale(0.95)";
                }}
              >
                {isProfile && initial ? (
                  <span
                    className="w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center"
                    style={{
                      background: active ? "rgba(255,255,255,0.25)" : "rgba(0,113,227,0.2)",
                      color: active ? "#fff" : "#0071E3",
                    }}
                  >
                    {initial}
                  </span>
                ) : (
                  <div className="relative">
                    <Icon
                      className="w-[18px] h-[18px]"
                      style={{ color: active ? "#fff" : "var(--text-secondary)" }}
                      strokeWidth={active ? 2.2 : 1.8}
                    />
                    {/* Unacknowledged badge for Tasks */}
                    {label === "Tasks" && unacknowledgedCount > 0 && (
                      <span
                        className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#0071E3] border-2"
                        style={{ borderColor: 'transparent' }}
                      />
                    )}
                  </div>
                )}

                {/* Tooltip */}
                <span
                  className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap"
                  style={{
                    background: "var(--surface-raised)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "0.6875rem",
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
