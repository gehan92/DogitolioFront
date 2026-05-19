/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff8f0',
          100: '#ffecd6',
          200: '#ffd4a8',
          300: '#ffb470',
          400: '#ff8c3a',
          500: '#e8702a',
          600: '#c5501a',
          700: '#a03c10',
          800: '#7d2e0d',
          900: '#5c2010',
        },
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f9f8f6',
          tertiary: '#f2f0ec',
          dark: '#1a1916',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.06)',
        'card-hover': '0 4px 8px rgba(0,0,0,.08), 0 12px 32px rgba(0,0,0,.10)',
        'modal': '0 24px 80px rgba(0,0,0,.18)',
      },
      animation: {
        'fade-up': 'fadeUp .4s cubic-bezier(.4,0,.2,1) both',
        'fade-in': 'fadeIn .3s ease both',
        'slide-in': 'slideIn .3s cubic-bezier(.4,0,.2,1) both',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeUp:  { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideIn: { from: { opacity: 0, transform: 'translateX(-12px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}
