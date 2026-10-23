import { ArrowLink, PageMeta } from '../components/Site'
import { Formation } from '../components/Formation'
import { lab } from '../content/lab'

export function NotFound() {
  return (
    <>
      <PageMeta title={`No such ring — ${lab.name}`} path="/404" noIndex />
      <main id="main-content" className="page-main not-found page-fade">
        <Formation />
        <h1>No such ring.</h1>
        <ArrowLink to="/ledger">Return to the ledger →</ArrowLink>
      </main>
    </>
  )
}
