import { useParams } from 'react-router-dom'
import { ArrowLink, PageMeta } from '../components/Site'
import { Formation } from '../components/Formation'
import { lab, modules } from '../content/lab'
import { useLabFeed, getModuleState } from '../content/feed'
import { NotFound } from './NotFound'

function statusText(status: 'planned' | 'executed' | 'documented') {
  if (status === 'executed') return 'Executed · write-up pending'
  return status
}

export function RingPage() {
  const { n } = useParams()
  const { data: feed } = useLabFeed()
  const moduleNumber = Number(n)
  const baseModule = modules.find((item) => item.n === moduleNumber)
  if (!baseModule) return <NotFound />
  
  // Derive module state from feed data
  const module = feed ? getModuleState(baseModule, feed.publishedEntries) : {
    ...baseModule,
    status: baseModule.status,
    statusText: statusText(baseModule.status),
    entries: baseModule.entries,
    allEntriesPublished: false,
    hasWriteUp: false
  }
  
  const previousModule = modules.find((item) => item.n === moduleNumber - 1)
  const nextModule = modules.find((item) => item.n === moduleNumber + 1)

  return (
    <>
      <PageMeta
        title={`Module ${module.n}: ${module.name} — ${lab.name}`}
        path={`/ring/${module.n}`}
      />
      <main id="main-content" className="page-main page-fade">
        <div className="ring-page-heading">
          <p className="kicker">Module {module.n} · {module.statusText}</p>
          <h1>{module.name}</h1>
          <div className="ring-page-heading__formation">
            <Formation currentRing={module.n} compact />
          </div>
        </div>

        <div className="ring-layout">
          <details className="marginalia marginalia--mobile">
            <summary>Module details</summary>
                      <Marginalia module={module} feed={feed} />
          </details>
          <aside className="marginalia marginalia--desktop" aria-label="Module details">
                      <Marginalia module={module} feed={feed} />
          </aside>
          <article className="ring-entry">
            {baseModule.statusNote && (
              <p className="status-note">{baseModule.statusNote}</p>
            )}
            <section className="ring-writeup-section">
              <h2>I. The breach</h2>
              <p>{module.hasWriteUp ? 'Write-up available.' : 'Write-up pending.'}</p>
            </section>
            <section className="ring-writeup-section">
              <h2>II. What the logs saw</h2>
              <p>{module.hasWriteUp ? 'Write-up available.' : 'Write-up pending.'}</p>
            </section>
            <section className="ring-writeup-section ring-writeup-section--detection">
              <h2>III. What would have stopped it</h2>
              <p>{module.hasWriteUp ? 'Write-up available.' : 'Write-up pending.'}</p>
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

function Marginalia({ module, feed }: { 
  module: { 
    n: number; 
    name: string; 
    attack: string[]; 
    keyEvent: string; 
    tools: string[]; 
    entries: number[];
    statusText: string;
    allEntriesPublished: boolean;
    hasWriteUp: boolean;
    writeUpUrl?: string;
  },
  feed: { posts: Array<{ entryNumber: number; slug: string }> } | null
}) {
  return (
    <dl className="marginalia__list">
      <div>
        <dt>Module</dt>
        <dd>{module.n} · {module.name}</dd>
      </div>
      <div>
        <dt>ATT&CK ID</dt>
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
          {module.entries.map((entry, index) => {
            const entryPost = feed?.posts.find(p => p.entryNumber === entry)
            const entryUrl = entryPost ? `${lab.blogUrl}/posts/${encodeURIComponent(entryPost.slug)}` : '#'
            const isPublished = !!entryPost
            
            return (
              <span key={entry}>
                {index > 0 && ', '}
                {isPublished ? (
                  <a href={entryUrl} target="_blank" rel="noopener noreferrer">
                    Entry #{entry}
                  </a>
                ) : (
                  `Entry #${entry}`
                )}
              </span>
            )
          })}
        </dd>
      </div>
      <div>
        <dt>Lab status</dt>
        <dd>{module.statusText}</dd>
      </div>
    </dl>
  )
}

