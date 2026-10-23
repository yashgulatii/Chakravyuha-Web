import { PageMeta } from '../components/Site'
import { ArchitectureDiagram } from './Shared'
import { lab } from '../content/lab'

export function Architecture() {
  return (
    <>
      <PageMeta title={`Architecture — ${lab.name}`} path="/architecture" />
      <main id="main-content" className="page-main page-fade">
        <header className="page-heading">
          <p className="kicker">{lab.platform} · Lab {lab.labVersion}</p>
          <h1>Architecture</h1>
        </header>
        <ArchitectureDiagram />
      </main>
    </>
  )
}
