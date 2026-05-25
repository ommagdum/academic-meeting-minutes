import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      /* ── Fonts ─────────────────────────────────────────── */
      fontFamily: {
        display: ["Outfit", "system-ui", "sans-serif"],
        body:    ["Inter",  "system-ui", "sans-serif"],
        sans:    ["Inter",  "system-ui", "sans-serif"],
      },

      /* ── Colors (shadcn token wrappers) ────────────────── */
      colors: {
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow:       "hsl(var(--primary-glow))",
          deep:       "hsl(var(--primary-deep))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          glow:       "hsl(var(--secondary-glow))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT:              "hsl(var(--sidebar-background))",
          foreground:           "hsl(var(--sidebar-foreground))",
          primary:              "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent:               "hsl(var(--sidebar-accent))",
          "accent-foreground":  "hsl(var(--sidebar-accent-foreground))",
          border:               "hsl(var(--sidebar-border))",
          ring:                 "hsl(var(--sidebar-ring))",
        },

        /* ── Raw brand palette (for direct use) ─────────── */
        brand: {
          bg:             "#0F1012",
          surface:        "#16181C",
          "surface-raised": "#1C1F25",
          accent:         "#0071E3",
          "accent-hover": "#0077ED",
          success:        "#34C759",
          warning:        "#FF9F0A",
          error:          "#FF453A",
          "text-primary":   "#F5F5F7",
          "text-secondary": "#A1A1AA",
          "text-tertiary":  "#52525B",
        },
      },

      /* ── Border radius scale ───────────────────────────── */
      borderRadius: {
        sm:   "6px",
        md:   "10px",    /* also --radius */
        lg:   "14px",
        xl:   "20px",
        "2xl": "28px",
        pill: "9999px",
      },

      /* ── Custom easing functions ───────────────────────── */
      transitionTimingFunction: {
        "out-expo":     "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-out-quart": "cubic-bezier(0.76, 0, 0.24, 1)",
        smooth:         "cubic-bezier(0.4, 0, 0.2, 1)",
      },

      /* ── Backdrop blur ─────────────────────────────────── */
      backdropBlur: {
        glass: "16px",
        heavy: "24px",
      },

      /* ── Keyframes + animations (for Tailwind classes) ─── */
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "chevron-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":       { transform: "translateY(6px)" },
        },
      },
      animation: {
        "accordion-down":   "accordion-down 0.2s ease-out",
        "accordion-up":     "accordion-up 0.2s ease-out",
        "fade-up":          "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in":          "fade-in 0.25s cubic-bezier(0.4,0,0.2,1) both",
        "scale-in":         "scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both",
        "slide-down":       "slide-down 0.25s cubic-bezier(0.16,1,0.3,1) both",
        "chevron-bounce":   "chevron-bounce 1.6s cubic-bezier(0.76,0,0.24,1) infinite",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
} satisfies Config;
