import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { lab } from '../content/lab'
import { useLabFeed } from '../content/feed'
import { DOCS_FILES } from '../utils/constants'
import type { DetectionRule } from '../content/feed'

const GITHUB_REPO = 'https://github.com/yashgulatii/Chakravyuha'

function DetectionTable({ rules }: { rules: DetectionRule[] }) {
  return (
    <div className="detection-table-wrapper">
      <table className="detection-table" role="grid">
        <thead>
          <tr>
            <th scope="col">Rule</th>
            <th scope="col">Title</th>
            <th scope="col">ATT&CK Tags</th>
            <th scope="col">Level</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={rule.path}>
              <td>
                <Link
                  to={`/docs/detections/${rule.path}`}
                  className="detection-link"
                >
                  {rule.name}
                </Link>
              </td>
              <td>{rule.title || '—'}</td>
              <td>
                <div className="detection-tags">
                  {rule.tags?.slice(0, 3).map((tag) => (
                    <span key={tag} className="detection-tag">
                      {tag}
                    </span>
                  ))}
                  {rule.tags && rule.tags.length > 3 && (
                    <span className="detection-tag more">+{rule.tags.length - 3} more</span>
                  )}
                </div>
              </td>
              <td>
                <span className={`detection-level level-${rule.level?.toLowerCase() || 'unknown'}`}>
                  {rule.level || '—'}
                </span>
              </td>
              <td>
                <span className={`detection-status status-${rule.status?.toLowerCase() || 'unknown'}`}>
                  {rule.status || '—'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Detections() {
  const { data: feed, loading, error } = useLabFeed()

  // Detections come from build-time cache via feed
  const detections = feed?.detections || { sigma: [], wazuh: [] }
  const sigmaRules = detections.sigma || []
  const wazuhRules = detections.wazuh || []

  return (
    <>
      <Helmet>
        <title>Detections — Documentation — {lab.name}</title>
        <meta name="description" content={`Sigma and Wazuh detection rules for ${lab.fullName}.`} />
        <link rel="canonical" href="https://chakravyuha.tech/docs/detections" />
      </Helmet>
      <main id="main-content" className="page-main docs-page detections-page">
        <div className="docs-container">
          <aside className="docs-sidebar-wrapper">
            <nav className="docs-sidebar" aria-label="Documentation navigation">
              <ul className="docs-sidebar__list">
                {DOCS_FILES.map((doc) => (
                  <li key={doc.slug} className="docs-sidebar__item">
                    <Link
                      to={`/docs/${doc.slug}`}
                      className="docs-sidebar__link"
                    >
                      {doc.title}
                    </Link>
                  </li>
                ))}
                <li className="docs-sidebar__item">
                  <Link
                    to="/docs/detections"
                    className="docs-sidebar__link active"
                    aria-current="page"
                  >
                    Detections
                  </Link>
                </li>
              </ul>
            </nav>
          </aside>
          <article className="docs-content">
            <header className="docs-header">
              <h1>Detections</h1>
              <p className="docs-lead">
                Detection rules for the {lab.name} lab — Sigma rules for SIEM platforms and Wazuh rules for host-based detection.
              </p>
              <div className="docs-meta">
                <a
                  href={`${GITHUB_REPO}/tree/main/detections`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="docs-repo-link"
                >
                  View on GitHub ↗
                </a>
                {feed && (
                  <span className="docs-last-synced">Last synced: {new Date(feed.fetchedAt).toLocaleDateString()}</span>
                )}
              </div>
            </header>

            {loading && (
              <div className="docs-loading">Loading detection rules…</div>
            )}

            {error && (
              <div className="docs-error" role="alert">
                            {error.message}
              </div>
            )}

            {!loading && !error && (
              <>
                <section className="detections-section">
                  <h2>Sigma Rules</h2>
                  <p className="detections-count">{sigmaRules.length} rules</p>
                  {sigmaRules.length > 0 ? (
                    <DetectionTable rules={sigmaRules} />
                  ) : (
                    <p className="detections-empty">No Sigma rules found in <code>detections/sigma/</code></p>
                  )}
                </section>

                <section className="detections-section">
                  <h2>Wazuh Rules</h2>
                  <p className="detections-count">{wazuhRules.length} rules</p>
                  {wazuhRules.length > 0 ? (
                    <DetectionTable rules={wazuhRules} />
                  ) : (
                    <p className="detections-empty">No Wazuh rules found in <code>detections/wazuh/</code></p>
                  )}
                </section>
              </>
            )}
          </article>
        </div>
      </main>
    </>
  )
}