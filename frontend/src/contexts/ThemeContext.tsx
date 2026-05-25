import { createContext, useContext, useEffect, useState } from "react";

/* ── Types ──────────────────────────────────────────────── */
interface ThemeContextType {
  isDark: boolean;
  toggle: () => void;
}

/* ── Context ────────────────────────────────────────────── */
const ThemeContext = createContext<ThemeContextType>({ isDark: true, toggle: () => {} });

export const useTheme = () => useContext(ThemeContext);

/* ── Provider ───────────────────────────────────────────── */
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Default to dark. Respect localStorage if set previously.
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem("theme");
    return stored ? stored === "dark" : true;
  });

  // Apply/remove .dark / .light on <html> whenever isDark changes
  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add("dark");
      html.classList.remove("light");
    } else {
      html.classList.add("light");
      html.classList.remove("dark");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggle = () => setIsDark((v) => !v);

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};
