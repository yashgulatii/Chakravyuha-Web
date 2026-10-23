import { useParams } from 'react-router-dom'
import { ArrowLink, PageMeta } from '../components/Site'
import { Formation } from '../components/Formation'
import { lab, modules } from '../content/lab'
import { NotFound } from './NotFound'

function statusText(status: (typeof modules)[number]['status']) {
  if (status === 'executed') return 'Executed · write-up pending'
  return status
}

export function RingPage() {
  const { n } = useParams()
  const moduleNumber = Number(n)
  const module = modules.find((item) => item.n === moduleNumber)
  if (!module) return <NotFound />
  const previousModule = modules.find((item) => item.n === module.n - 1)
  const nextModule = modules.find((item) => item.n === module.n + 1)

  return (
    <>
      <PageMeta
        title={`Module ${module.n}: ${module.name} — ${lab.name}`}
        path={`/ring/${module.n}`}
      />
      <main id="main-content" className="page-main page-fade">
        <div className="ring-page-heading">
          <p className="kicker">Module {module.n} · {statusText(module.status)}</p>
          <h1>{module.name}</h1>
          <div className="ring-page-heading__formation">
            <Formation currentRing={module.n} compact />
          </div>
        </div>

        <div className="ring-layout">
          <details className="marginalia marginalia--mobile">
            <summary>Module details</summary>
            <Marginalia module={module} />
          </details>
          <aside className="marginalia marginalia--desktop" aria-label="Module details">
            <Marginalia module={module} />
          </aside>
          <article className="ring-entry">
            {module.statusNote && (
              <p className="status-note">{module.statusNote}</p>
            )}
            <section className="ring-writeup-section">
              <h2>I. The breach</h2>
              <p>Write-up pending.</p>
            </section>
            <section className="ring-writeup-section">
              <h2>II. What the logs saw</h2>
              <p>Write-up pending.</p>
            </section>
            <section className="ring-writeup-section ring-writeup-section--detection">
              <h2>III. What would have stopped it</h2>
              <p>Write-up pending.</p>
              </section>
          </article>
        </div>

        <nav className="ring-pagination" aria-label="Ring navigation">
          {previousModule ? (
            <ArrowLink to={`/ring/${previousModule.n}`}>
              ← Module {previousModule.n} · {previousModule.name}
            </ArrowLink>
          ) : (
            <span />
          )}
          {nextModule ? (
            <ArrowLink to={`/ring/${nextModule.n}`}>
              Module {nextModule.n} · {nextModule.name} →
            </ArrowLink>
          ) : (
            <span />
          )}
        </nav>
      </main>
    </>
  )
}

function Marginalia({ module }: { module: (typeof modules)[number] }) {
  return (
    <dl className="marginalia__list">
      <div>
        <dt>Module</dt>
        <dd>{module.n} · {module.name}</dd>
      </div>
      <div>
        <dt>ATT&amp;CK ID</dt>
        <dd className="mono">{module.attack.join(', ')}</dd>
      </div>
      <div>
        <dt>Key event</dt>
        <dd className="mono">{module.keyEvent}</dd>
      </div>
      <div>
        <dt>Tools</dt>
        <dd className="mono">{module.tools.join(', ')}</dd>
      </div>
      <div>
        <dt>Entries</dt>
        <dd className="mono">
          {module.entries.map((entry, index) => (
            <span key={entry}>
              {index > 0 && ', '}
              {module.status === 'documented' ? (
                <a href={lab.blogUrl} target="_blank" rel="noopener noreferrer">
                  Entry #{entry}
                </a>
              ) : (
                `Entry #${entry}`
              )}
            </span>
          ))}
        </dd>
      </div>
      <div>
        <dt>Lab status</dt>
        <dd>{statusText(module.status)}</dd>
      </div>
    </dl>
  )
}
