/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-light': 'var(--primary-light)',
        'primary-dark': 'var(--primary-dark)',
        secondary: 'var(--secondary)',
        'secondary-light': 'var(--secondary-light)',
        'secondary-dark': 'var(--secondary-dark)',
        accent: 'var(--accent)',
        'accent-light': 'var(--accent-light)',
        'accent-dark': 'var(--accent-dark)',
        success: 'var(--success)',
        'success-light': 'var(--success-light)',
        'success-dark': 'var(--success-dark)',
        warning: 'var(--warning)',
        'warning-light': 'var(--warning-light)',
        'warning-dark': 'var(--warning-dark)',
        danger: 'var(--danger)',
        'danger-light': 'var(--danger-light)',
        'danger-dark': 'var(--danger-dark)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        warningDark: '#B8860B',
        successDark: '#2E7D32',
        primaryDark: '#5A7A9E',
        secondaryDark: '#8FA8CF',
        accentDark: '#E89AAB',
        dangerDark: '#E67A7A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
