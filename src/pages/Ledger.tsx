import { useMemo, useState } from 'react'
import { ArrowLink, PageMeta } from '../components/Site'
import { lab } from '../content/lab'
import { useLabFeed, type ModuleState } from '../content/feed'

// Foundation as "Ring 0" - prep/foundational work
const foundationModule: ModuleState = {
  ring: 0,
  slug: 'foundation',
  name: 'Foundation',
  attack_id: 'Prep',
  status: 'executed',
  entries: [0, 1, 2, 3],
  writeup: null,
  evidence_dir: null,
  readmeContent: null,
  githubUrl: 'https://github.com/yashgulatii/Chakravyuha',
  allEntriesPublished: true,
  statusText: 'Foundation',
}

export function Ledger() {
  const [ascending, setAscending] = useState(true)
  const { data: feed } = useLabFeed()
  
  // Derive module states from feed (GitHub modules.yml + feed)
  const moduleStates = feed?.modules ?? []
  
  // All modules including foundation
  const allModules = useMemo(() => 
    [foundationModule, ...moduleStates].sort((left, right) => (ascending ? left.ring - right.ring : right.ring - left.ring)),
    [ascending, moduleStates]
  )

  return (
    <>
      <PageMeta title={`Ledger | ${lab.name}`} path="/ledger" />
      <main id="main-content" className="page-main page-fade">
        <header className="page-heading">
          <p className="kicker">{moduleStates.length + 1} rings · status from GitHub</p>
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
              {allModules.map((state) => {
                const isFoundation = state.ring === 0
                return (
                  <tr key={`${state.ring}-${state.name}`} className={isFoundation ? 'foundation-row' : ''}>
                    <td data-label="Ring" className="mono">
                      <ArrowLink to={isFoundation ? '#' : `/ring/${state.ring}`} className="table-ring-link">
                        {state.ring}
                      </ArrowLink>
                    </td>
                    <td data-label="Module">{state.name}</td>
                    <td data-label="ATT&CK" className="mono">{state.attack_id}</td>
                    <td data-label="Key event" className="mono">
                      {isFoundation ? 'Series intro & lab build' : 
                       state.entries.length > 0 ? `Entry ${state.entries[0]}` : '—'}
                    </td>
                    <td data-label="Lab status">
                      <span className={`status status--${state.status}`}>{state.statusText}</span>
                    </td>
                    <td data-label="Entries" className="mono">
                      {state.entries.map((entry, entryIndex) => {
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