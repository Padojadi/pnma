/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        night: {
          950: '#050d18',
          900: '#071525',
          800: '#0c2340',
          700: '#14345c',
        },
        signal: {
          400: '#f0b429',
          500: '#e8a317',
          600: '#c9840d',
        },
        mist: '#e8eef6',
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        sans: ['Manrope', 'sans-serif'],
      },
      backgroundImage: {
        'road-glow':
          'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(232,163,23,0.22), transparent), linear-gradient(160deg, #050d18 0%, #0c2340 45%, #071525 100%)',
        'asphalt':
          'linear-gradient(180deg, rgba(5,13,24,0.2), rgba(5,13,24,0.85)), url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseLine: {
          '0%, 100%': { opacity: '0.35', transform: 'scaleX(0.85)' },
          '50%': { opacity: '1', transform: 'scaleX(1)' },
        },
        sweep: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(120%)' },
        },
      },
      animation: {
        rise: 'rise 0.8s ease-out both',
        'rise-delay': 'rise 0.9s ease-out 0.15s both',
        'rise-delay-2': 'rise 1s ease-out 0.3s both',
        'pulse-line': 'pulseLine 2.8s ease-in-out infinite',
        sweep: 'sweep 3.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
