/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(224, 76%, 48%)',
          foreground: 'hsl(0, 0%, 100%)',
          glow: 'hsl(224, 76%, 65%)',
          deep: 'hsl(224, 76%, 35%)',
        },
        secondary: {
          DEFAULT: 'hsl(43, 74%, 66%)',
          foreground: 'hsl(224, 15%, 15%)',
          glow: 'hsl(43, 74%, 75%)',
        },
        background: 'hsl(0, 0%, 100%)',
        foreground: 'hsl(224, 15%, 15%)',
        muted: {
          DEFAULT: 'hsl(220, 13%, 96%)',
          foreground: 'hsl(224, 10%, 45%)',
        },
        border: 'hsl(220, 13%, 91%)',
        card: {
          DEFAULT: 'hsl(0, 0%, 100%)',
          foreground: 'hsl(224, 15%, 15%)',
        },
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, hsl(224, 76%, 48%) 0%, hsl(224, 76%, 35%) 100%)',
        'subtle-gradient': 'linear-gradient(180deg, hsl(0, 0%, 100%) 0%, hsl(220, 13%, 96%) 100%)',
        'card-gradient': 'linear-gradient(145deg, hsl(0, 0%, 100%) 0%, hsl(220, 13%, 96%) 100%)',
      },
      boxShadow: {
        elegant: '0 10px 30px -10px hsl(224 76% 48% / 0.15)',
        card: '0 4px 20px -2px hsl(224 76% 48% / 0.1)',
        glow: '0 0 40px hsl(224 76% 65% / 0.3)',
      },
    },
  },
  plugins: [],
};