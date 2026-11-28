import { useParams } from 'react-router-dom'
import { ArrowLink, PageMeta } from '../components/Site'
import { Formation } from '../components/Formation'
import { lab } from '../content/lab'
import { useLabFeed, type ModuleState, type LabFeedData } from '../content/feed'
import { NotFound } from './NotFound'

export function RingPage() {
  const { n } = useParams()
  const { data: feed } = useLabFeed()
  const moduleNumber = Number(n)
  const module = feed?.modules.find((item) => item.ring === moduleNumber)
  if (!module) return <NotFound />
  
  const previousModule = feed?.modules.find((item) => item.ring === moduleNumber - 1)
  const nextModule = feed?.modules.find((item) => item.ring === moduleNumber + 1)

  return (
    <>
      <PageMeta
        title={`Ring ${module.ring}: ${module.name} | ${lab.name}`}
        path={`/ring/${module.ring}`}
      />
      <main id="main-content" className="page-main page-fade">
        <div className="ring-page-heading">
          <p className="kicker">Ring {module.ring} · {module.statusText}</p>
          <h1>{module.name}</h1>
          <div className="ring-page-heading__formation">
            <Formation currentRing={module.ring} compact />
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
                      {module.readmeContent && (
                        <div className="ring-readme" dangerouslySetInnerHTML={{ __html: module.readmeContent }} />
            )}
                      {module.readmeContent ? (
                        <>
                          <section className="ring-writeup-section">
                            <h2>I. The breach</h2>
                            <p>Write-up available.</p>
                          </section>
                          <section className="ring-writeup-section">
                            <h2>II. What the logs saw</h2>
                            <p>Write-up available.</p>
                          </section>
                          <section className="ring-writeup-section ring-writeup-section--detection">
                            <h2>III. What would have stopped it</h2>
                            <p>Write-up available.</p>
                          </section>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
          </article>
        </div>

        <nav className="ring-pagination" aria-label="Ring navigation">
          {previousModule ? (
                    <ArrowLink to={`/ring/${previousModule.ring}`}>
                      ← Module {previousModule.ring} · {previousModule.name}
            </ArrowLink>
          ) : (
            <span />
          )}
          {nextModule ? (
                    <ArrowLink to={`/ring/${nextModule.ring}`}>
                      Module {nextModule.ring} · {nextModule.name} →
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
  module: ModuleState;
  feed: LabFeedData | null
}) {
  return (
    <dl className="marginalia__list">
      <div>
        <dt>Module</dt>
                <dd>Ring {module.ring} · {module.name}</dd>
      </div>
      <div>
        <dt>ATT&CK ID</dt>
                <dd className="mono">{module.attack_id}</dd>
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
              {module.githubUrl && (
                <div>
                  <dt>Source</dt>
                  <dd>
                    <a href={module.githubUrl} target="_blank" rel="noopener noreferrer" className="text-sm">
                      View on GitHub
                    </a>
                  </dd>
                </div>
              )}
    </dl>
  )
}

