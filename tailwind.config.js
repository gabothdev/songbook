/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        handwriting: ['Caveat', 'Kalam', 'cursive'],
        serif: ['Lora', 'Merriweather', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        paper: {
          50: '#fdfbf7',
          100: '#fbf7ee',
          200: '#f5edd9',
          300: '#eddcb9',
          400: '#e1c590',
          500: '#cb9e57',
          600: '#ba8544',
          700: '#9b6738',
          800: '#7e5333',
          900: '#67442d',
        },
        desk: {
          light: '#2a2421',
          DEFAULT: '#1c1815',
          dark: '#120f0d',
        },
        ink: {
          blue: '#1e3a8a',
          black: '#1f242d',
          pencil: '#4b5563',
          faint: '#9ca3af',
          red: '#dc2626',
        },
        tab: {
          yellow: '#fef08a',
          rose: '#fecdd3',
          teal: '#99f6e4',
          purple: '#e9d5ff',
          amber: '#fde68a',
        }
      },
      boxShadow: {
        'notebook': '0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        'page-left': '-10px 10px 25px rgba(0,0,0,0.15), inset -15px 0 20px -10px rgba(0,0,0,0.08)',
        'page-right': '10px 10px 25px rgba(0,0,0,0.15), inset 15px 0 20px -10px rgba(0,0,0,0.08)',
        'spiral': 'inset 0 1px 2px rgba(255,255,255,0.6), 0 2px 5px rgba(0,0,0,0.35)',
        'sticker': '2px 4px 10px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
      },
      backgroundImage: {
        'lined-paper': 'repeating-linear-gradient(transparent, transparent 27px, #e2d9c8 28px)',
        'grid-paper': 'radial-gradient(#d1c7b7 1px, transparent 1px)',
        'music-staff': 'repeating-linear-gradient(transparent, transparent 14px, #e5dfd5 15px)',
      }
    },
  },
  plugins: [],
}
