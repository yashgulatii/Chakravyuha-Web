export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    borderRadius: {
      none: '0',
      DEFAULT: '2px',
    },
    extend: {
      colors: {
        paper: 'var(--paper)',
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        hairline: 'var(--hairline)',
        recessed: 'var(--recessed)',
        vermilion: 'var(--vermilion)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        popover: 'var(--popover)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        primary: 'var(--primary)',
      },
      fontFamily: {
        reading: ['Newsreader Variable', 'Georgia', 'serif'],
        mono: ['JetBrains Mono Variable', 'Courier New', 'monospace'],
      },
      boxShadow: {
        DEFAULT: 'none',
        sm: 'none',
        md: 'none',
        lg: 'none',
      },
    },
  },
  plugins: [],
}
