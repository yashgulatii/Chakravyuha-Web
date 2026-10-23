import { useId, useMemo, useState } from 'react'
import { decoys, hosts, lab, tiers, tierRule, type Host } from '../content/lab'

interface Point {
  x: number
  y: number
}

const hostLayout: Record<string, Point> = {
  SIEM: { x: 60, y: 112 },
  'DC-01': { x: 300, y: 112 },
  'SRV-01': { x: 540, y: 112 },
  'WS-01': { x: 60, y: 500 },
  'WS-02': { x: 540, y: 500 },
  KALI: { x: 940, y: 252 },
}

const compactHostLayout: Record<string, Point> = {
  SIEM: { x: 60, y: 70 },
  'DC-01': { x: 250, y: 70 },
  'SRV-01': { x: 440, y: 70 },
  'WS-01': { x: 60, y: 250 },
  'WS-02': { x: 440, y: 250 },
  KALI: { x: 780, y: 160 },
}

const switchPoint = { x: 360, y: 420 }
const compactSwitchPoint = { x: 290, y: 200 }
const hostWidth = 150
type ConnectionRoute = { start: Point; end: Point; path: string }

const connectionRoutes: Record<string, ConnectionRoute> = {
  SIEM: {
    start: { x: 68, y: 128 },
    end: { x: 360, y: 428 },
    path: 'M68 128 H48 V428 H360',
  },
  'DC-01': {
    start: { x: 300, y: 140 },
    end: { x: 430, y: 416 },
    path: 'M300 140 H288 V400 H430 V416',
  },
  'SRV-01': {
    start: { x: 690, y: 140 },
    end: { x: 500, y: 428 },
    path: 'M690 140 H760 V428 H500',
  },
  'WS-01': {
    start: { x: 60, y: 500 },
    end: { x: 410, y: 440 },
    path: 'M60 500 H42 V470 H410 V440',
  },
  'WS-02': {
    start: { x: 690, y: 500 },
    end: { x: 450, y: 440 },
    path: 'M690 500 H760 V470 H450 V440',
  },
  KALI: {
    start: { x: 940, y: 282 },
    end: { x: 500, y: 416 },
    path: 'M940 282 H850 V400 H500 V416',
  },
}

const compactConnectionRoutes: Record<string, ConnectionRoute> = {
  SIEM: {
    start: { x: 68, y: 86 },
    end: { x: 290, y: 208 },
    path: 'M68 86 H48 V208 H290',
  },
  'DC-01': {
    start: { x: 250, y: 98 },
    end: { x: 360, y: 196 },
    path: 'M250 98 H238 V184 H360 V196',
  },
  'SRV-01': {
    start: { x: 590, y: 98 },
    end: { x: 430, y: 196 },
    path: 'M590 98 H625 V184 H430 V196',
  },
  'WS-01': {
    start: { x: 60, y: 250 },
    end: { x: 340, y: 220 },
    path: 'M60 250 H42 V240 H340 V220',
  },
  'WS-02': {
    start: { x: 590, y: 250 },
    end: { x: 380, y: 220 },
    path: 'M590 250 H625 V240 H380 V220',
  },
  KALI: {
    start: { x: 780, y: 190 },
    end: { x: 430, y: 208 },
    path: 'M780 190 H650 V208 H430',
  },
}

function nodeDescription(host: Host) {
  return [
    host.ip,
    host.os,
    ...host.roles,
    host.tier,
    host.logSources?.join(', '),
    host.nics?.join(', '),
    `Firewall ${host.firewall ? 'enabled' : 'disabled'}`,
    host.note,
  ]
    .filter(Boolean)
    .join('; ')
}

function HostGlyph({ host, x, y }: { host: Host; x: number; y: number }) {
  const isWorkstation = host.id.startsWith('WS-')
  const isLaptop = host.id === 'KALI'
  return (
    <g className="host-glyph" transform={`translate(${x + 8} ${y + 4})`}>
      {isWorkstation ? (
        <>
          <rect className="diagram-shape" x="0" y="0" width="26" height="19" />
          <path className="diagram-shape" d="M13 19v5m-8 3h16" />
        </>
      ) : isLaptop ? (
        <>
          <path className="diagram-shape" d="M0 0h27v18H0zM-4 22h35l-4 3H0z" />
          <path className="diagram-shape" d="M3 3h21v12H3z" />
        </>
      ) : (
        <>
          <rect className="diagram-shape" x="0" y="0" width="25" height="28" />
          <path className="diagram-shape" d="M0 9h25M0 18h25" />
          <circle className="diagram-node-dot" cx="20" cy="5" r="1" />
          <circle className="diagram-node-dot" cx="20" cy="14" r="1" />
          <circle className="diagram-node-dot" cx="20" cy="23" r="1" />
        </>
      )}
      {host.firewall && (
        <path
          className="diagram-shield"
          d="M132 1l6 2.5v5c0 4-2.5 6.5-6 8-3.5-1.5-6-4-6-8v-5z"
        />
      )}
    </g>
  )
}

function SwitchGlyph({ x, y }: Point) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path className="diagram-shape" d="M0 8l12-12h116l12 12-12 12H12z" />
      <text className="diagram-switch-label" x="70" y="12" textAnchor="middle">
        Virtual Switch
      </text>
    </g>
  )
}

function HostNode({
  host,
  compact,
  selected,
  active,
  onSelect,
  onActive,
}: {
  host: Host
  compact: boolean
  selected: boolean
  active: boolean
  onSelect: (host: Host) => void
  onActive: (id: string | null) => void
}) {
  const position = (compact ? compactHostLayout : hostLayout)[host.id]
  const activate = () => onSelect(host)

  return (
    <g
      className={`architecture-node${active ? ' architecture-node--active' : ''}${selected ? ' architecture-node--selected' : ''}`}
      transform={`translate(${position.x} ${position.y})`}
      role={compact ? undefined : 'button'}
      tabIndex={compact ? undefined : 0}
      aria-label={compact ? undefined : `${host.id}, ${nodeDescription(host)}`}
      aria-pressed={compact ? undefined : selected}
      onClick={compact ? undefined : activate}
      onKeyDown={
        compact
          ? undefined
          : (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                activate()
              }
            }
      }
      onMouseEnter={() => onActive(host.id)}
      onMouseLeave={() => onActive(null)}
      onFocus={() => onActive(host.id)}
      onBlur={() => onActive(null)}
    >
      <rect className="diagram-hit-area" x="0" y="0" width={hostWidth} height="100" />
      <HostGlyph host={host} x={0} y={0} />
      <text className="diagram-host-name" x="44" y="19">
        {host.id}
      </text>
      {!compact && (
        <>
          <text className="diagram-host-meta" x="8" y="48">{host.ip}</text>
          <text className="diagram-host-detail" x="8" y="66">{host.os}</text>
          {host.roles.map((role, index) => (
            <text className="diagram-host-detail" x="8" y={82 + index * 16} key={role}>
              {role}
            </text>
          ))}
          {host.logSources?.map((source, index) => (
            <text className="diagram-host-meta" x="8" y={82 + host.roles.length * 16 + index * 14} key={source}>
              {source}
            </text>
          ))}
          {host.tier && (
            <text
              className="diagram-host-meta"
              x="8"
              y={82 + host.roles.length * 16 + (host.logSources?.length ?? 0) * 14}
            >
              {host.tier}
            </text>
          )}
        </>
      )}
    </g>
  )
}

function NatCloud({ x, y }: Point) {
  return (
    <g className="nat-cloud" transform={`translate(${x} ${y})`}>
      <path
        className="diagram-shape"
        d="M16 34h90a17 17 0 0 0 0-34 25 25 0 0 0-47-7A22 22 0 0 0 16 5a15 15 0 0 0 0 29z"
      />
      <text className="diagram-host-name" x="61" y="22" textAnchor="middle">VMware NAT</text>
    </g>
  )
}

function NetworkSvg({
  compact,
  decoysShown,
  selectedHost,
  hoveredHost,
  onSelect,
  onActive,
  id,
}: {
  compact: boolean
  decoysShown: boolean
  selectedHost: string | null
  hoveredHost: string | null
  onSelect: (host: Host) => void
  onActive: (id: string | null) => void
  id: string
}) {
  const layout = compact ? compactHostLayout : hostLayout
  const routes = compact ? compactConnectionRoutes : connectionRoutes
  const switchPosition = compact ? compactSwitchPoint : switchPoint
  const domainHosts = useMemo(
    () =>
      hosts
        .filter((host) => host.zone === 'domain')
        .sort((left, right) => layout[left.id].y - layout[right.id].y || layout[left.id].x - layout[right.id].x),
    [layout],
  )
  const attackerHosts = hosts.filter((host) => host.zone === 'attacker')
  const connectionPaths = hosts.map((host) => {
    return { host, ...routes[host.id] }
  })

  return (
    <svg
      className={`architecture-svg${compact ? ' architecture-svg--compact' : ''}`}
      viewBox={compact ? '0 0 1000 395' : '0 0 1200 760'}
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
    >
      <title id={`${id}-title`}>{lab.fullName} network diagram</title>
      <desc id={`${id}-desc`}>
        Internal domain machines and attacker machine connect to the Host-Only Virtual Switch.
        KALI also connects to VMware NAT for controlled internet egress.
      </desc>
      <rect
        className="architecture-zone architecture-zone--domain"
        x="20"
        y={compact ? 25 : 38}
        width={compact ? 640 : 780}
        height={compact ? 270 : 700}
      />
      {!compact && (
        <text className="architecture-zone-label" x="58" y="67">
          {lab.domain} / {lab.subnet} / {lab.network}
        </text>
      )}
      <rect
        className="architecture-zone architecture-zone--attacker"
        x={compact ? 700 : 860}
        y={compact ? 75 : 130}
        width={compact ? 260 : 300}
        height={compact ? 185 : 360}
      />
      {!compact && <text className="architecture-zone-label" x="876" y="158">Attacker environment</text>}
      {connectionPaths.map(({ host, start, end, path }) => (
        <g
          className={`diagram-connection${hoveredHost === host.id ? ' diagram-connection--active' : ''}`}
          key={host.id}
        >
          <path className="diagram-link" d={path} />
          <circle className="diagram-link-dot" cx={start.x} cy={start.y} r="2.2" />
          <circle className="diagram-link-dot" cx={end.x} cy={end.y} r="2.2" />
        </g>
      ))}
      {decoysShown && (
        <g aria-hidden="true">
          {decoys.map((decoy) => {
            const position = layout[decoy.attachedTo]
            const index = decoys.filter((item) => item.attachedTo === decoy.attachedTo).findIndex(
              (item) => item.id === decoy.id,
            )
            const yOffset = (decoy.attachedTo === 'DC-01' ? 160 : 140) + index * 40
            return (
              <path
                className="diagram-decoy-connector"
                d={`M${position.x} ${position.y + (decoy.attachedTo === 'DC-01' ? 136 : 102)} V${position.y + yOffset}`}
                key={decoy.id}
              />
            )
          })}
        </g>
      )}
      <SwitchGlyph {...switchPosition} />
      {domainHosts.map((host) => (
        <HostNode
          key={host.id}
          host={host}
          compact={compact}
          selected={selectedHost === host.id}
          active={hoveredHost === host.id}
          onSelect={onSelect}
          onActive={onActive}
        />
      ))}
      {attackerHosts.map((host) => (
        <HostNode
          key={host.id}
          host={host}
          compact={compact}
          selected={selectedHost === host.id}
          active={hoveredHost === host.id}
          onSelect={onSelect}
          onActive={onActive}
        />
      ))}
      {!compact && decoysShown && (
        <g aria-hidden="true">
          {decoys.map((decoy) => {
            const position = layout[decoy.attachedTo]
            const index = decoys.filter((item) => item.attachedTo === decoy.attachedTo).findIndex(
              (item) => item.id === decoy.id,
            )
            const yOffset = (decoy.attachedTo === 'DC-01' ? 160 : 140) + index * 40
            return (
              <g
                className="diagram-decoy-group"
                key={decoy.id}
                transform={`translate(${position.x} ${position.y + yOffset})`}
              >
                <rect className="diagram-decoy" x="0" y="0" width="420" height="30" />
                <text className="diagram-decoy-tag" x="8" y="20">DECOY</text>
                <text className="diagram-decoy-label" x="72" y="20">{decoy.label}</text>
              </g>
            )
          })}
        </g>
      )}
      <>
        <path className="diagram-nat-link" d={compact ? 'M855 218 V336' : 'M1005 352 V576'} />
        <circle className="diagram-nat-dot" cx={compact ? 855 : 1005} cy={compact ? 218 : 352} r="2.2" />
        <circle className="diagram-nat-dot" cx={compact ? 855 : 1005} cy={compact ? 336 : 576} r="2.2" />
        <NatCloud x={compact ? 754 : 904} y={compact ? 350 : 590} />
        {!compact && (
          <text className="diagram-nat-caption" x="1000" y="653" textAnchor="middle">
            Controlled internet egress (Kali only)
          </text>
        )}
      </>
    </svg>
  )
}

function HostDetails({ host }: { host: Host }) {
  const fields: [string, string | string[] | boolean | undefined][] = [
    ['IP', host.ip],
    ['OS', host.os],
    ['Roles', host.roles],
    ['Tier', host.tier],
    ['Log sources', host.logSources],
    ['NICs', host.nics],
    ['Firewall', host.firewall ? 'Yes' : 'No'],
    ['Note', host.note],
  ]
  return (
    <dl className="host-details">
      {fields
        .filter(([, value]) => value !== undefined)
        .map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd>
          </div>
        ))}
    </dl>
  )
}

function MobileHostList({
  selectedHost,
  onSelect,
  decoysShown,
}: {
  selectedHost: Host | null
  onSelect: (host: Host) => void
  decoysShown: boolean
}) {
  const domainHosts = hosts.filter((host) => host.zone === 'domain')
  const attackerHosts = hosts.filter((host) => host.zone === 'attacker')
  const renderHost = (host: Host) => (
    <li className="mobile-host" key={host.id}>
      <button
        type="button"
        aria-pressed={selectedHost?.id === host.id}
        aria-label={`View ${host.id} details`}
        onClick={() => onSelect(host)}
      >
        <strong className="mono">{host.id}</strong>
        <span className="mono">{host.ip}</span>
        <span>{host.os}</span>
        <span>{host.roles.join(' · ')}</span>
        {host.logSources && <span>{host.logSources.join(' · ')}</span>}
        {host.tier && <span>{host.tier}</span>}
        <span>{host.firewall ? 'Behind firewall' : 'Firewall disabled'}</span>
      </button>
      {decoysShown && decoys.filter((decoy) => decoy.attachedTo === host.id).map((decoy) => (
        <p className="mobile-decoy" key={decoy.id}>
          <span className="mono">DECOY</span> {decoy.label}
        </p>
      ))}
    </li>
  )

  return (
    <div className="architecture-mobile-list">
      <section>
        <h2>{lab.domain} / {lab.subnet} / {lab.network}</h2>
        <ul>{domainHosts.map(renderHost)}</ul>
      </section>
      <p className="mobile-switch mono">Virtual Switch · Host-Only</p>
      <section>
        <h2>Attacker environment</h2>
        <ul>{attackerHosts.map(renderHost)}</ul>
      </section>
      <p className="mobile-nat mono">KALI → VMware NAT · Controlled internet egress (Kali only)</p>
    </div>
  )
}

export function ArchitectureDiagram({ compact = false }: { compact?: boolean }) {
  const id = useId()
  const [selectedHostId, setSelectedHostId] = useState<string | null>(null)
  const [hoveredHost, setHoveredHost] = useState<string | null>(null)
  const [decoysShown, setDecoysShown] = useState(true)
  const selectedHost = hosts.find((host) => host.id === selectedHostId) ?? null

  function selectHost(host: Host) {
    setSelectedHostId((selected) => (selected === host.id ? null : host.id))
  }

  if (compact) {
    return (
      <figure className="architecture-diagram architecture-diagram--compact">
        <NetworkSvg
          compact
          decoysShown={false}
          selectedHost={null}
          hoveredHost={null}
          onSelect={() => undefined}
          onActive={() => undefined}
          id={id}
        />
      </figure>
    )
  }

  return (
    <section className="architecture-page" aria-label="Lab network architecture">
      <div className="architecture-controls">
        <button
          type="button"
          className="text-control"
          aria-pressed={decoysShown}
          onClick={() => setDecoysShown((shown) => !shown)}
        >
          Decoys: {decoysShown ? 'shown' : 'hidden'}
        </button>
      </div>
      <div className="architecture-main">
        <figure className="architecture-diagram">
          <NetworkSvg
            compact={false}
            decoysShown={decoysShown}
            selectedHost={selectedHostId}
            hoveredHost={hoveredHost}
            onSelect={selectHost}
            onActive={setHoveredHost}
            id={id}
          />
          <figcaption>As built, not as aspired.</figcaption>
          <MobileHostList
            selectedHost={selectedHost}
            onSelect={selectHost}
            decoysShown={decoysShown}
          />
          <div className="visually-hidden architecture-definitions">
            <h2>Network details</h2>
            <dl>
              {hosts.map((host) => (
                <div key={host.id}>
                  <dt>{host.id}</dt>
                  <dd>{nodeDescription(host)}</dd>
                </div>
              ))}
              <div>
                <dt>Host-Only connections</dt>
                <dd>{hosts.map((host) => `${host.id} connects to the Virtual Switch`).join('. ')}.</dd>
              </div>
              <div>
                <dt>NAT connection</dt>
                <dd>KALI connects to VMware NAT for controlled internet egress.</dd>
              </div>
              {decoysShown &&
                decoys.map((decoy) => (
                  <div key={decoy.id}>
                    <dt>Decoy</dt>
                    <dd>{decoy.label} is attached to {decoy.attachedTo}.</dd>
                  </div>
                ))}
            </dl>
          </div>
        </figure>
        <aside className="architecture-marginalia" aria-live="polite">
          {selectedHost ? (
            <>
              <h2>{selectedHost.id}</h2>
              <HostDetails host={selectedHost} />
            </>
          ) : (
            <p>Select a machine to inspect its recorded details.</p>
          )}
        </aside>
        <div className="architecture-mobile-details" aria-live="polite">
          {selectedHost && (
            <>
              <h2>{selectedHost.id}</h2>
              <HostDetails host={selectedHost} />
            </>
          )}
        </div>
      </div>
      <div className="architecture-supporting">
        <section>
          <h2>Legend</h2>
          <ul className="legend-list">
            <li><span className="legend-sample legend-sample--link" /> Solid · Host-Only network link</li>
            <li><span className="legend-sample legend-sample--nat" /> Dashed vermilion · NAT</li>
            <li><span className="legend-sample legend-sample--shield" /> Shield · host firewall enabled</li>
            <li><span className="legend-sample legend-sample--decoy" /> Dashed box · decoy object</li>
            <li><span className="legend-sample legend-sample--domain" /> Ink outline · internal domain</li>
            <li><span className="legend-sample legend-sample--attacker" /> Vermilion outline · attacker environment</li>
          </ul>
        </section>
        <section>
          <h2>Purple team use cases</h2>
          <ul className="plain-list">
            {lab.useCases.map((useCase) => <li key={useCase}>{useCase}</li>)}
          </ul>
        </section>
        <p className="lab-facts mono">
          {lab.platform} · Lab {lab.labVersion} · {lab.purpose}
        </p>
        <section className="tier-section">
          <h2>Tiered administration</h2>
          <ul className="tier-list">
            {tiers.map((tier) => (
              <li key={tier.tier}>
                <span className="mono">Tier {tier.tier}</span>
                <span>{tier.scope}</span>
              </li>
            ))}
          </ul>
          <p className="tier-rule">{tierRule}</p>
        </section>
        <p className="diagram-footnote">
          Decoy names are representational. Real deception would be more realistic.
        </p>
      </div>
    </section>
  )
}
