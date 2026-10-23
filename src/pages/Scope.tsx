import { PageMeta } from '../components/Site'
import { decisions, gate, gateRule, lab } from '../content/lab'

export function Scope() {
  return (
    <>
      <PageMeta title={`Scope and rules — ${lab.name}`} path="/scope" />
      <main id="main-content" className="page-main page-fade scope-page">
        <header className="page-heading">
          <p className="kicker">Boundaries before techniques</p>
          <h1>Scope and rules</h1>
        </header>
        <div className="prose">
          <p>This is a closed lab on an isolated network.</p>
          <p>Techniques are documented for defensive learning.</p>
          <p>Nothing on this site connects to or exposes lab systems.</p>
          <p>No working exploit code is published outside the lab context.</p>
          <p>
            The project is by{' '}
            <a href={lab.authorUrl} target="_blank" rel="noopener noreferrer">
              Project author ↗
            </a>
            .
          </p>
        </div>
        <section className="readiness-gate" aria-labelledby="readiness-gate-title">
          <h2 id="readiness-gate-title">The Attack Readiness Gate</h2>
          <ul className="gate-list">
            {gate.map((item) => (
              <li key={item}>
                <span className="gate-check" aria-hidden="true">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="gate-rule">{gateRule}</p>
        </section>
        <section className="decisions-section" aria-labelledby="decisions-title">
          <h2 id="decisions-title">Decisions on record</h2>
          <ol className="decision-list">
            {decisions.map((decision) => (
              <li key={decision.title}>
                <h3>{decision.title}</h3>
                <p>{decision.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </>
  )
}
