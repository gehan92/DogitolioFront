/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff0f3',
          100: '#ffd6df',
          200: '#ffadbf',
          300: '#ff7a96',
          400: '#ff4d6d',
          500: '#ff2d55',
          600: '#e0103a',
          700: '#bf002e',
          800: '#960023',
          900: '#72001a',
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
        'glow': '0 0 40px rgba(255,45,85,0.3)',
        'glow-sm': '0 0 20px rgba(255,45,85,0.18)',
      },
      animation: {
        'fade-up': 'fadeUp .4s cubic-bezier(.4,0,.2,1) both',
        'fade-in': 'fadeIn .3s ease both',
        'slide-in': 'slideIn .3s cubic-bezier(.4,0,.2,1) both',
        'spin-slow': 'spin 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeUp:  { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideIn: { from: { opacity: 0, transform: 'translateX(-12px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        float:   { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-12px)' } },
      },
    },
  },
  plugins: [],
}
