/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enables class-based dark mode
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fbfd',
          100: '#d2f4fd',
          200: '#b6e9fc', // Light Blue Primary Background
          300: '#68d3f1',
          400: '#2bbbeb',
          500: '#1ca4c8', // Vibrant Cyan Accent
          600: '#1c4d5e', // Dark Blue Secondary Card / Sidebar / Welcome Card Background
          700: '#133e4d', // Darker Blue Hover
          800: '#0d2d38',
          900: '#081c24',
          950: '#020b0e',
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'Arial', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-out both',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'bell-ring': 'bellRing 1.5s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'spring-slide-in': 'springSlideIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
        'bounce-in': 'bounceIn 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
        'morph-blob-1': 'morphBlob1 20s ease-in-out infinite alternate',
        'morph-blob-2': 'morphBlob2 25s ease-in-out infinite alternate',
        'progress-line': 'progressLine 1.5s ease-in-out infinite',
        'alert-wiggle': 'alertWiggle 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(15px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bellRing: {
          '0%, 100%': { transform: 'rotate(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'rotate(5deg)' },
          '20%, 40%, 60%, 80%': { transform: 'rotate(-5deg)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0px rgba(37, 99, 235, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(37, 99, 235, 0)' },
        },
        springSlideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        morphBlob1: {
          '0%': { borderRadius: '42% 58% 70% 30% / 45% 45% 55% 55%', transform: 'translate(0, 0) rotate(0deg)' },
          '50%': { borderRadius: '70% 30% 52% 48% / 60% 40% 60% 40%', transform: 'translate(30px, -50px) scale(1.08) rotate(180deg)' },
          '100%': { borderRadius: '42% 58% 70% 30% / 45% 45% 55% 55%', transform: 'translate(0, 0) rotate(360deg)' },
        },
        morphBlob2: {
          '0%': { borderRadius: '70% 30% 52% 48% / 60% 40% 60% 40%', transform: 'translate(0, 0) rotate(0deg)' },
          '50%': { borderRadius: '42% 58% 70% 30% / 45% 45% 55% 55%', transform: 'translate(-40px, 40px) scale(1.05) rotate(-180deg)' },
          '100%': { borderRadius: '70% 30% 52% 48% / 60% 40% 60% 40%', transform: 'translate(0, 0) rotate(-360deg)' },
        },
        progressLine: {
          '0%': { left: '-100%', width: '30%' },
          '50%': { width: '60%' },
          '100%': { left: '100%', width: '30%' },
        },
        alertWiggle: {
          '0%, 100%': { transform: 'rotate(0)' },
          '10%, 30%, 50%': { transform: 'rotate(3deg)' },
          '20%, 40%': { transform: 'rotate(-3deg)' },
          '60%': { transform: 'rotate(0)' },
        },
      },
    },
  },
  plugins: [],
}
