import { Link } from 'react-router-dom'
import { ArrowLink, PageMeta } from '../components/Site'
import { Formation } from '../components/Formation'
import { lab } from '../content/lab'
import { useLabFeed, type ModuleState } from '../content/feed'
import { ArchitectureDiagram } from './Shared'

const method = [
  { roman: 'I', title: 'The breach', text: 'What happened as the path moved inward.' },
  {
    roman: 'II',
    title: 'What the logs saw',
    text: 'The telemetry and detection that should have surfaced it.',
  },
  {
    roman: 'III',
    title: 'What would have stopped it',
    text: 'The control that could have broken the chain.',
  },
]

function countWord(value: number) {
  const words: Record<number, string> = {
    0: 'Zero',
    1: 'One',
    2: 'Two',
    3: 'Three',
    4: 'Four',
    5: 'Five',
    6: 'Six',
    8: 'Eight',
    9: 'Nine',
  }
  return words[value] ?? String(value)
}

function getExecutedCount(modules: ModuleState[]): number {
  return modules.filter(m => m.status === 'executed' || m.status === 'documented').length
}

function getDocumentedCount(modules: ModuleState[]): number {
  return modules.filter(m => m.status === 'documented').length
}

export function Home() {
  const { data: feed } = useLabFeed()
  const moduleStates = feed?.modules ?? []
  const moduleCount = moduleStates.length
  const executedCount = getExecutedCount(moduleStates)
  const documentedCount = getDocumentedCount(moduleStates)
  const publishedCount = feed?.publishedCount ?? lab.publishedPosts
  const plannedPosts = feed?.totalPlannedEntries ?? lab.plannedPosts

  return (
    <>
      <PageMeta title={lab.fullName} path="/" />
      <main id="main-content" className="page-main page-fade">
        <section className="hero">
          <div className="hero__text">
            <p className="kicker">{lab.fullName}</p>
            <h1>
              {countWord(moduleCount)} rings. Each one breached, then explained from the other side.
            </h1>
            <p className="hero__summary">
              A closed Active Directory lab where every attack is mapped to MITRE ATT&CK
              and paired with the detection that should have caught it. Built and documented
              by the project author.
            </p>
            <ArrowLink to="/ledger">Read the ledger →</ArrowLink>
          </div>
          <div className="hero__formation">
            <Formation />
          </div>
        </section>

        <p className="status-line mono">
          Modules executed: {executedCount} of {moduleCount} · Modules documented:{' '}
                  {documentedCount} of {moduleCount} · Entries published: {publishedCount} of{' '}
                  {plannedPosts}
        </p>

        <section className="method-section" aria-labelledby="method-title">
          <h2 id="method-title">How every ring is written</h2>
          <div className="method-list">
            {method.map((step) => (
              <article className="method-item" key={step.roman}>
                <span className="method-item__roman">{step.roman}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="home-ledger" aria-labelledby="ledger-title">
          <div>
            <p className="kicker">{moduleCount} modules · one path inward</p>
            <h2 id="ledger-title">The ledger</h2>
          </div>
          <ol className="ring-index">
            {moduleStates.map((state) => (
              <li key={state.ring}>
                <ArrowLink to={`/ring/${state.ring}`} className="ring-index__link">
                  <span className="mono">{state.ring}</span>
                  <span>{state.name}</span>
                  <span className={`status status--${state.status}`}>{state.statusText}</span>
                </ArrowLink>
              </li>
            ))}
          </ol>
          <ArrowLink to="/ledger">Open the full ledger →</ArrowLink>
        </section>

        <section className="architecture-teaser" aria-labelledby="architecture-title">
          <div>
            <p className="kicker">The lab as built</p>
            <h2 id="architecture-title">Architecture</h2>
            <p>{lab.domain} · {lab.network} · {lab.platform}</p>
            <ArrowLink to="/architecture">See the architecture →</ArrowLink>
          </div>
          <Link
            className="architecture-teaser__diagram"
            to="/architecture"
            aria-label="Open the lab network architecture"
          >
            <ArchitectureDiagram compact />
          </Link>
        </section>
      </main>
    </>
  )
}