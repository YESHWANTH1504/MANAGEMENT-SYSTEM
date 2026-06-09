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
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.85rem', { lineHeight: '1.25rem' }],
        sm: ['0.95rem', { lineHeight: '1.4rem' }],
        base: ['1.05rem', { lineHeight: '1.55rem' }],
        lg: ['1.2rem', { lineHeight: '1.8rem' }],
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
