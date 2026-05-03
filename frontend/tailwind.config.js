/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#0e0f0c',
          green: '#9fe870',
          'dark-green': '#163300',
          mint: '#e2f6d5',
          'pastel-green': '#cdffad',
          warm: '#454745',
          gray: '#868685',
          surface: '#e8ebe6',
          orange: '#ffc091',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
      },
      fontSize: {
        'display-mega': ['7.88rem', { lineHeight: '0.85', fontWeight: '900', letterSpacing: 'normal' }],
        'display-hero': ['6rem', { lineHeight: '0.85', fontWeight: '900' }],
        'display-section': ['4rem', { lineHeight: '0.85', fontWeight: '900' }],
        'display-sub': ['2.5rem', { lineHeight: '0.85', fontWeight: '900' }],
        'card-title': ['1.625rem', { lineHeight: '1.23', fontWeight: '600', letterSpacing: '-0.024em' }],
        'feature': ['1.375rem', { lineHeight: '1.25', fontWeight: '600', letterSpacing: '-0.018em' }],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        pill: '9999px',
      },
      boxShadow: {
        ring: 'rgba(14,15,12,0.12) 0px 0px 0px 1px',
        'ring-green': '0 0 0 2px rgba(159,232,112,0.5)',
        'ring-inset': 'rgb(134,134,133) 0px 0px 0px 1px inset',
        'card': '0 4px 24px rgba(14,15,12,0.08), rgba(14,15,12,0.12) 0px 0px 0px 1px',
        'card-hover': '0 12px 40px rgba(14,15,12,0.15), rgba(14,15,12,0.15) 0px 0px 0px 1px',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      animation: {
        'blur-in': 'blurIn 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-down': 'slideDown 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-green': 'pulseGreen 2s ease-in-out infinite',
        'gradient-x': 'gradientX 8s ease infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'bounce-gentle': 'bounceGentle 0.6s cubic-bezier(0.34,1.56,0.64,1)',
      },
      keyframes: {
        blurIn: {
          '0%': { filter: 'blur(12px)', opacity: '0', transform: 'scale(0.96)' },
          '100%': { filter: 'blur(0)', opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.88)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        pulseGreen: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(159,232,112,0)' },
          '50%': { boxShadow: '0 0 0 10px rgba(159,232,112,0.25)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceGentle: {
          '0%': { transform: 'scale(0.95)' },
          '60%': { transform: 'scale(1.03)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
