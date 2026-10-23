import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { lab } from '../content/lab'

interface PageMetaProps {
  title: string
  description?: string
  path: string
  noIndex?: boolean
}

export function PageMeta({
  title,
  description = `${lab.fullName} is an isolated defensive research environment.`,
  path,
  noIndex = false,
}: PageMetaProps) {
  const canonical = `https://chakravyuha.tech${path}`
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noIndex ? (
        <meta name="robots" content="noindex, follow" />
      ) : (
        <link rel="canonical" href={canonical} />
      )}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content="https://chakravyuha.tech/og-image.svg" />
    </Helmet>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'),
  )

  useEffect(() => {
    const synchronize = () => {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
    }
    window.addEventListener('themechange', synchronize)
    return () => window.removeEventListener('themechange', synchronize)
  }, [])

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = nextTheme
    document.documentElement.style.colorScheme = nextTheme
    try {
      window.localStorage.setItem('theme', nextTheme)
    } catch {
      // Theme remains available for this page even when storage is disabled.
    }
    const color = getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim()
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (themeColor && color) themeColor.content = color
    setTheme(nextTheme)
    window.dispatchEvent(new Event('themechange'))
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-pressed={theme === 'dark'}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      onClick={toggleTheme}
    >
      {theme === 'dark' ? 'Paper' : 'Night'}
    </button>
  )
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="wordmark" to="/" aria-label={`${lab.name} home`}>
        <svg className="wordmark__glyph" viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="16" cy="16" r="13.5" />
          <circle cx="16" cy="16" r="8.5" />
          <circle cx="16" cy="16" r="3.5" />
          <circle className="wordmark__dot" cx="16" cy="16" r="1.4" />
        </svg>
        <span className="wordmark__name">{lab.name}</span>
        <span className="wordmark__native">{lab.devanagari}</span>
      </Link>
      <div className="header-controls">
        <nav className="site-nav" aria-label="Main navigation">
          <Link to="/ledger">Ledger</Link>
          <Link to="/architecture">Architecture</Link>
          <Link to="/scope">Scope</Link>
          <a href={lab.blogUrl} target="_blank" rel="noopener noreferrer">
            Field notes ↗
          </a>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>{lab.name} · An Active Directory purple team lab</p>
      <div className="site-footer__links">
        <a href={lab.authorUrl} target="_blank" rel="noopener noreferrer">
          Project author ↗
        </a>
        {lab.repoUrl && (
          <a href={lab.repoUrl} target="_blank" rel="noopener noreferrer">
            Repository ↗
          </a>
        )}
        <ThemeToggle />
      </div>
    </footer>
  )
}

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="site-frame">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  )
}

export function ArrowLink({
  to,
  children,
  className = '',
}: {
  to: string
  children: ReactNode
  className?: string
}) {
  return (
    <Link className={`arrow-link ${className}`} to={to}>
      {children}
    </Link>
  )
}
