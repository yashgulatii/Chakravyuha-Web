import { useMemo, useState } from 'react'
import { ArrowLink, PageMeta } from '../components/Site'
import { foundation, lab, modules } from '../content/lab'
import { useLabFeed, getModuleState } from '../content/feed'

// Foundation as "Ring 0" - prep/foundational work
const foundationModule = {
  n: 0,
  name: 'Foundation',
  attack: ['Prep'],
  keyEvent: 'Series intro & lab build',
  tools: ['VMware', 'Windows Server', 'Wazuh', 'Sysmon'],
  entries: foundation.entries, // [0, 1, 2, 3]
  status: 'executed' as const,
  statusNote: 'Lab environment built, tiered AD deployed, logging pipeline confirmed, deception layer placed.',
}

export function Ledger() {
  const [ascending, setAscending] = useState(true)
  const { data: feed } = useLabFeed()
  
  // Include foundation as Ring 0 in the rows
  const allModules = useMemo(
    () => [foundationModule, ...modules].sort((left, right) => (ascending ? left.n - right.n : right.n - left.n)),
    [ascending],
  )

  // Derive module states from feed (including foundation)
  const moduleStates = useMemo(() => 
      allModules.map(module => getModuleState(module, feed?.publishedEntries ?? [])),
      [allModules, feed?.publishedEntries]
  )

  return (
    <>
      <PageMeta title={`Ledger | ${lab.name}`} path="/ledger" />
      <main id="main-content" className="page-main page-fade">
        <header className="page-heading">
          <p className="kicker">{modules.length + 1} rings · status from the lab</p>
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
                    aria-label={`Sort by ring ${ascending ? 'descending' : 'ascending'}`}
                  >
                    Ring <span aria-hidden="true">{ascending ? '↑' : '↓'}</span>
                  </button>
                </th>
                <th scope="col">Module</th>
                <th scope="col">ATT&CK</th>
                <th scope="col">Key event</th>
                <th scope="col">Lab status</th>
                <th scope="col">Entries</th>
              </tr>
            </thead>
            <tbody>
              {allModules.map((item, index) => {
                const state = moduleStates[index]
                const isFoundation = item.n === 0
                return (
                  <tr key={`${item.n}-${item.name}`} className={isFoundation ? 'foundation-row' : ''}>
                    <td data-label="Ring" className="mono">
                      <ArrowLink to={isFoundation ? '#' : `/ring/${item.n}`} className="table-ring-link">
                        {item.n}
                      </ArrowLink>
                    </td>
                    <td data-label="Module">{item.name}</td>
                    <td data-label="ATT&CK" className="mono">
                      {item.attack.join(', ')}
                    </td>
                    <td data-label="Key event" className="mono">{item.keyEvent}</td>
                    <td data-label="Lab status">
                      <span className={`status status--${state.status}`}>{state.statusText}</span>
                    </td>
                    <td data-label="Entries" className="mono">
                      {item.entries.map((entry, entryIndex) => {
                        const entryPost = feed?.posts.find(p => p.entryNumber === entry)
                        const entryUrl = entryPost ? `${lab.blogUrl}/posts/${encodeURIComponent(entryPost.slug)}` : '#'
                        const isPublished = !!entryPost
                        
                        return (
                          <span key={entry}>
                            {entryIndex > 0 && ', '}
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