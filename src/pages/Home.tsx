import { Link } from 'react-router-dom'
import { ArrowLink, PageMeta } from '../components/Site'
import { Formation } from '../components/Formation'
import { lab, modules } from '../content/lab'
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

export function Home() {
  const moduleCount = modules.length
  const executedCount = modules.filter((item) => item.status === 'executed').length
  const documentedCount = modules.filter((item) => item.status === 'documented').length

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
              A closed Active Directory lab where every attack is mapped to MITRE ATT&amp;CK
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
          {documentedCount} of {moduleCount} · Entries published: {lab.publishedPosts} of{' '}
          {lab.plannedPosts}
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
            {modules.map((item) => (
              <li key={item.n}>
                <ArrowLink to={`/ring/${item.n}`} className="ring-index__link">
                  <span className="mono">{item.n}</span>
                  <span>{item.name}</span>
                  <span className={`status status--${item.status}`}>
                    {item.status === 'executed' ? 'Executed · write-up pending' : item.status}
                  </span>
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
