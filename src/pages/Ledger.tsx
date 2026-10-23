import { useMemo, useState } from 'react'
import { ArrowLink, PageMeta } from '../components/Site'
import { foundation, lab, modules } from '../content/lab'

export function Ledger() {
  const [ascending, setAscending] = useState(true)
  const rows = useMemo(
    () => [...modules].sort((left, right) => (ascending ? left.n - right.n : right.n - left.n)),
    [ascending],
  )

  return (
    <>
      <PageMeta title={`Ledger — ${lab.name}`} path="/ledger" />
      <main id="main-content" className="page-main page-fade">
        <header className="page-heading">
          <p className="kicker">{modules.length} modules · status from the lab</p>
          <h1>The ledger</h1>
        </header>
        <div className="table-scroll">
          <table className="ledger-table">
            <thead>
              <tr>
                <th scope="col">
                  <button
                    className="sort-button"
                    type="button"
                    onClick={() => setAscending((value) => !value)}
                    aria-label={`Sort by module ${ascending ? 'descending' : 'ascending'}`}
                  >
                    Ring <span aria-hidden="true">{ascending ? '↑' : '↓'}</span>
                  </button>
                </th>
                <th scope="col">Module</th>
                <th scope="col">ATT&amp;CK</th>
                <th scope="col">Key event</th>
                <th scope="col">Lab status</th>
                <th scope="col">Entries</th>
              </tr>
            </thead>
            <tbody>
              <tr className="foundation-row">
                <td colSpan={6}>
                  <em>
                    Foundation entries {foundation.entries[0]} to{' '}
                    {foundation.entries[foundation.entries.length - 1]}.{' '}
                    {foundation.note.split('. ').at(-1)}
                  </em>
                </td>
              </tr>
              {rows.map((item) => {
                const statusText =
                  item.status === 'executed' ? 'Executed · write-up pending' : item.status
                return (
                  <tr key={`${item.n}-${item.name}`}>
                    <td data-label="Ring" className="mono">
                      <ArrowLink to={`/ring/${item.n}`} className="table-ring-link">
                        {item.n}
                      </ArrowLink>
                    </td>
                    <td data-label="Module">{item.name}</td>
                    <td data-label="ATT&CK" className="mono">
                      {item.attack.join(', ')}
                    </td>
                    <td data-label="Key event" className="mono">{item.keyEvent}</td>
                    <td data-label="Lab status">
                      <span className={`status status--${item.status}`}>{statusText}</span>
                    </td>
                    <td data-label="Entries" className="mono">
                      {item.entries.map((entry, index) => (
                        <span key={entry}>
                          {index > 0 && ', '}
                          {item.status === 'documented' ? (
                            <a href={lab.blogUrl} target="_blank" rel="noopener noreferrer">
                              Entry #{entry}
                            </a>
                          ) : (
                            `Entry #${entry}`
                          )}
                        </span>
                      ))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  )
}
