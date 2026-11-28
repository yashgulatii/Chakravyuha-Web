import { useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { lab } from '../content/lab'
import { useLabFeed } from '../content/feed'
import type { DocFile } from '../content/feed'

const GITHUB_REPO = 'https://github.com/yashgulatii/Chakravyuha'

function useDocs() {
  const { data: feed, loading: feedLoading, error: feedError } = useLabFeed()

  // Docs come from build-time cache via feed (object keyed by slug, convert to array)
  const docsObj = (feed?.docs || {}) as Record<string, DocFile>
  const docs = Object.values(docsObj)
  const loading = feedLoading
  const error = feedError?.message || null

  return { docs, loading, error }
}

function DocSidebar({ docs, currentSlug }: { docs: DocFile[]; currentSlug: string }) {
  return (
    <nav className="docs-sidebar" aria-label="Documentation navigation">
      <ul className="docs-sidebar__list">
        {docs.map((doc) => (
          <li key={doc.slug} className="docs-sidebar__item">
            <Link
              to={`/docs/${doc.slug}`}
              className={`docs-sidebar__link ${doc.slug === currentSlug ? 'active' : ''}`}
              aria-current={doc.slug === currentSlug ? 'page' : undefined}
            >
              {doc.title}
            </Link>
          </li>
        ))}
        <li className="docs-sidebar__item">
          <Link
            to="/docs/detections"
            className={`docs-sidebar__link ${currentSlug === 'detections' ? 'active' : ''}`}
            aria-current={currentSlug === 'detections' ? 'page' : undefined}
          >
            Detections
          </Link>
        </li>
      </ul>
    </nav>
  )
}

export function DocsIndex() {
  const { docs, loading, error } = useDocs()
  const { data: feed } = useLabFeed()

  return (
    <>
      <Helmet>
        <title>Documentation — {lab.name}</title>
        <meta name="description" content={`Technical documentation for ${lab.fullName}.`} />
        <link rel="canonical" href="https://chakravyuha.tech/docs" />
      </Helmet>
      <main id="main-content" className="page-main docs-index">
        <div className="docs-container">
          <aside className="docs-sidebar-wrapper">
            <DocSidebar docs={docs} currentSlug="overview" />
          </aside>
          <article className="docs-content">
            <header className="docs-header">
              <h1>Documentation</h1>
              <p className="docs-lead">
                Technical reference for the {lab.name} lab — architecture, build process, logging pipeline,
                detection rules, and operational guides.
              </p>
              <div className="docs-meta">
                <a
                  href={GITHUB_REPO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="docs-repo-link"
                >
                  View repository on GitHub ↗
                </a>
                {feed && (
                  <span className="docs-last-synced">Last synced: {new Date(feed.fetchedAt).toLocaleDateString()}</span>
                )}
              </div>
            </header>

            {loading && (
              <div className="docs-loading">Loading documentation…</div>
            )}

            {error && (
              <div className="docs-error" role="alert">
                Failed to load documentation index. Please try again later.
              </div>
            )}

            {!loading && !error && (
              <div className="docs-grid">
                {docs
                  .filter((d) => !d.error)
                  .map((doc) => (
                    <Link key={doc.slug} to={`/docs/${doc.slug}`} className="docs-card">
                      <h3>{doc.title}</h3>
                      <p>{doc.content?.slice(0, 200).replace(/[#*`_\[\]]/g, '')}…</p>
                    </Link>
                  ))}
              </div>
            )}
          </article>
        </div>
      </main>
    </>
  )
}

export function DocsPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { docs, loading, error } = useDocs()
  const { data: feed } = useLabFeed()

  // Find the current doc
  const doc = docs.find((d) => d.slug === slug)

  // If not found, redirect to 404 or index
  useEffect(() => {
    if (!loading && !doc && slug !== 'detections') {
      navigate('/docs')
    }
  }, [loading, doc, slug, navigate])

  if (slug === 'detections') {
    navigate('/docs/detections')
    return null
  }

  return (
    <>
      {doc && (
        <Helmet>
          <title>{doc.title} — Documentation — {lab.name}</title>
          <meta name="description" content={`Documentation for ${doc.title} in ${lab.fullName}.`} />
          <link rel="canonical" href={`https://chakravyuha.tech/docs/${slug}`} />
        </Helmet>
      )}
      <main id="main-content" className="page-main docs-page">
        <div className="docs-container">
          <aside className="docs-sidebar-wrapper">
            <DocSidebar docs={docs} currentSlug={slug || ''} />
          </aside>
          <article className="docs-content">
            {loading && <div className="docs-loading">Loading documentation…</div>}

            {error && (
              <div className="docs-error" role="alert">
                Failed to load documentation. Please try again later.
              </div>
            )}

            {doc && doc.error && (
              <div className="docs-error" role="alert">
                Failed to load <code>{doc.path}</code>. The file may not exist in the repository.
              </div>
            )}

            {doc && !doc.error && doc.html && (
              <>
                <header className="docs-header">
                  <h1>{doc.title}</h1>
                  <div className="docs-meta">
                    <a
                      href={`${GITHUB_REPO}/blob/main/${doc.path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="docs-edit-link"
                    >
                      Edit on GitHub ↗
                    </a>
                    {feed && (
                      <span className="docs-last-synced">Last synced: {new Date(feed.fetchedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </header>
                <div
                  className="docs-body"
                  dangerouslySetInnerHTML={{ __html: doc.html }}
                />
                {doc.headings && doc.headings.length > 0 && (
                  <nav className="docs-toc" aria-label="Table of contents">
                    <h2>On this page</h2>
                    <ul>
                      {doc.headings.map((h) => (
                        <li key={h.slug} className={`toc-level-${h.level}`}>
                          <a href={`#${h.slug}`}>{h.text}</a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
              </>
            )}
          </article>
        </div>
      </main>
    </>
  )
}