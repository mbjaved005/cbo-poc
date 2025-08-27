/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        cbo: {
          'purple': '#5326f8',
          'purple-dark': '#4318d6',
          'purple-light': '#f2eeff',
          'background': '#f2eeff',
          'text-dark': '#1a1a1a',
          'text-secondary': '#6b7280',
          'bg': '#f1f3f9',
          'primary': '#17365f',
          'secondary': '#63667d',
          'border': '#cbcbcb',
          'input-bg': '#fafafa',
          'text-muted': '#5b5b5f',
        }
      },
      fontFamily: {
        arabic: ['Cairo', 'Amiri', 'sans-serif'],
        'source-sans': ['Source Sans Pro', 'sans-serif'],
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
