import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { lab } from '../content/lab'
import { useLabFeed } from '../content/feed'
import { DOCS_FILES, DETECTION_FOLDERS } from '../utils/markdown'

const GITHUB_BASE = 'https://raw.githubusercontent.com/yashgulatii/Chakravyuha/main'
const GITHUB_REPO = 'https://github.com/yashgulatii/Chakravyuha'

interface DetectionRule {
  path: string
  name: string
  title?: string
  tags?: string[]
  level?: string
  status?: string
  description?: string
  content?: string
  html?: string
  error?: string
}

async function fetchFileList(folder: string): Promise<string[]> {
  try {
    // GitHub API to list files in a directory
    const apiUrl = `https://api.github.com/repos/yashgulatii/Chakravyuha/contents/${folder}?ref=main`
    const res = await fetch(apiUrl)
    if (!res.ok) return []
    const data = await res.json()
    return data
      .filter((item: any) => item.type === 'file' && (item.name.endsWith('.yml') || item.name.endsWith('.yaml') || item.name.endsWith('.xml')))
      .map((item: any) => `${folder}/${item.name}`)
  } catch {
    return []
  }
}

async function fetchDetectionContent(path: string): Promise<string | null> {
  try {
    const res = await fetch(`${GITHUB_BASE}/${path}`)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function parseSigmaRule(content: string): Partial<DetectionRule> {
  const titleMatch = content.match(/title:\s*(.+)/)
  const tagsMatch = content.match(/tags:\s*\[([^\]]+)\]/)
  const levelMatch = content.match(/level:\s*(\w+)/)
  const statusMatch = content.match(/status:\s*(\w+)/)
  const descriptionMatch = content.match(/description:\s*(.+)/)

  return {
    title: titleMatch?.[1]?.trim()?.replace(/^["']|["']$/g, ''),
    tags: tagsMatch?.[1]?.split(',').map((t) => t.trim().replace(/^["']|["']$/g, '')) || [],
    level: levelMatch?.[1]?.trim(),
    status: statusMatch?.[1]?.trim(),
    description: descriptionMatch?.[1]?.trim()?.replace(/^["']|["']$/g, ''),
  }
}

function parseWazuhRule(content: string): Partial<DetectionRule> {
  // Wazuh rules are XML - parse for basic info
  const levelMatch = content.match(/level="(\d+)"/)
  const descriptionMatch = content.match(/<description>([^<]+)<\/description>/)
  const groupsMatch = content.match(/<groups>([^<]+)<\/groups>/)

  return {
    title: descriptionMatch?.[1]?.trim(),
    tags: groupsMatch?.[1]?.split(',').map((t) => t.trim()) || [],
    level: levelMatch?.[1]?.trim(),
    status: 'stable',
  }
}

function useDetections() {
  const [sigmaRules, setSigmaRules] = useState<DetectionRule[]>([])
  const [wazuhRules, setWazuhRules] = useState<DetectionRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadDetections() {
      setLoading(true)
      setError(null)

      try {
        // Fetch file lists
        const [sigmaFiles, wazuhFiles] = await Promise.all([
          fetchFileList(DETECTION_FOLDERS.sigma),
          fetchFileList(DETECTION_FOLDERS.wazuh),
        ])

        // Fetch and parse Sigma rules
        const sigmaResults: DetectionRule[] = []
        for (const path of sigmaFiles) {
          const content = await fetchDetectionContent(path)
          if (!content) continue
          const parsed = parseSigmaRule(content)
          sigmaResults.push({
            path,
            name: path.split('/').pop()?.replace(/\.(yml|yaml)$/, '') || '',
            content,
            ...parsed,
          } as DetectionRule)
        }

        // Fetch and parse Wazuh rules
        const wazuhResults: DetectionRule[] = []
        for (const path of wazuhFiles) {
          const content = await fetchDetectionContent(path)
          if (!content) continue
          const parsed = parseWazuhRule(content)
          wazuhResults.push({
            path,
            name: path.split('/').pop()?.replace(/\.xml$/, '') || '',
            content,
            ...parsed,
          } as DetectionRule)
        }

        if (!cancelled) {
          setSigmaRules(sigmaResults)
          setWazuhRules(wazuhResults)
          if (sigmaResults.length === 0 && sigmaFiles.length > 0) {
            setError('Some Sigma detection rules failed to load')
          }
          if (wazuhResults.length === 0 && wazuhFiles.length > 0) {
            setError('Some Wazuh detection rules failed to load')
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load detections')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDetections()

    return () => {
      cancelled = true
    }
  }, [])

  return { sigmaRules, wazuhRules, loading, error }
}

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
  const { sigmaRules, wazuhRules, loading, error } = useDetections()
  const { data: feed } = useLabFeed()

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
                {error}
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