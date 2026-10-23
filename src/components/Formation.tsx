import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { lab, modules, type LabStatus } from '../content/lab'

const gapAngles = [20, 150, 275, 60, 200, 330, 110, 240, 10]

function mulberry32(seed: number) {
  return () => {
    let value = (seed += 0x6d2b79f5)
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function createRingPath(n: number) {
  const random = mulberry32(n)
  const radius = 392 - 36 * (n - 1)
  const points = Array.from({ length: 72 }, (_, index) => {
    const angle = (index * 360) / 72
    const jitteredRadius = radius + (random() * 2 - 1) * 1.2
    const radians = ((angle - 90) * Math.PI) / 180
    return {
      angle,
      x: 400 + Math.cos(radians) * jitteredRadius,
      y: 400 + Math.sin(radians) * jitteredRadius,
    }
  })
  const gapCenter = gapAngles[n - 1]
  const arcs: string[] = []
  let current = ''

  for (const point of points) {
    const distance = Math.abs(((point.angle - gapCenter + 540) % 360) - 180)
    if (distance < 9) {
      if (current) arcs.push(current)
      current = ''
      continue
    }
    current += `${current ? ' L' : 'M'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`
  }
  if (current) arcs.push(current)
  return arcs.join(' ')
}

function statusLabel(status: LabStatus) {
  if (status === 'executed') return 'Executed in the lab, write-up pending'
  if (status === 'documented') return 'Documented'
  return 'Planned'
}

interface FormationProps {
  currentRing?: number
  compact?: boolean
}

export function Formation({ currentRing, compact = false }: FormationProps) {
  const [activeModule, setActiveModule] = useState<number | null>(currentRing ?? null)
  const [animate, setAnimate] = useState(false)
  const paths = useMemo(() => new Map(modules.map((item) => [item.n, createRingPath(item.n)])), [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let animationFrame = 0
    try {
      if (window.sessionStorage.getItem('chakravyuha-formation-seen')) return
      window.sessionStorage.setItem('chakravyuha-formation-seen', 'true')
      animationFrame = window.requestAnimationFrame(() => setAnimate(true))
    } catch {
      animationFrame = window.requestAnimationFrame(() => setAnimate(true))
    }
    return () => window.cancelAnimationFrame(animationFrame)
  }, [])

  const focused = modules.find((item) => item.n === activeModule)

  return (
    <figure className={`formation${compact ? ' formation--compact' : ''}`}>
      <svg
        className={`formation__svg${animate ? ' formation--animate' : ''}`}
        viewBox="0 0 800 800"
        role="group"
        aria-labelledby="formation-title formation-description"
      >
        <title id="formation-title">{lab.name} module formation</title>
        <desc id="formation-description">
          {modules.length} interactive concentric module rings. Each ring links to its module page.
        </desc>
        {modules.map((item) => {
          const path = paths.get(item.n)
          if (!path) return null
          const className = `formation__ring formation__ring--${item.status}`
          const isCurrent = item.n === currentRing
          const ringLength = (2 * Math.PI * (392 - 36 * (item.n - 1)) * (342 / 360)).toFixed(1)

          return (
            <Link
              key={item.n}
              to={`/ring/${item.n}`}
              className={`formation__link${isCurrent ? ' formation__link--current' : ''}`}
              style={{
                '--ring-order': item.n,
                '--path-length': `${ringLength}px`,
                viewTransitionName: `ring-${item.n}`,
              } as CSSProperties}
              aria-label={`Module ${item.n}: ${item.name}; ATT&CK ${item.attack.join(', ')}; ${statusLabel(item.status)}`}
              onMouseEnter={() => setActiveModule(item.n)}
              onMouseLeave={() => setActiveModule(currentRing ?? null)}
              onFocus={() => setActiveModule(item.n)}
              onBlur={() => setActiveModule(currentRing ?? null)}
              onClick={(event) => {
                const documentWithTransitions = document as Document & {
                  startViewTransition?: (callback: () => void) => unknown
                }
                if (!documentWithTransitions.startViewTransition) return
                event.preventDefault()
                documentWithTransitions.startViewTransition(() => {
                  window.history.pushState({}, '', `/ring/${item.n}`)
                  window.dispatchEvent(new PopStateEvent('popstate'))
                })
              }}
            >
              <path className={className} d={path} />
              {item.status === 'executed' && (
                <path className="formation__ring formation__ring--executed-overlay" d={path} />
              )}
              <path
                className={`formation__ring-detail formation__ring-detail--${item.status}`}
                d={path}
              />
            </Link>
          )
        })}
        <circle className="formation__center" cx="400" cy="400" r="7" />
        <text className="formation__center-label" x="414" y="396">DC-01</text>
      </svg>
      <figcaption className="formation__caption" aria-live="polite">
        {focused ? (
          <>
            <span className="formation__leader" aria-hidden="true" />
            <span className="formation__caption-number">Module {focused.n}</span>
            <span>{focused.name}</span>
            <span className="mono">{focused.attack.join(', ')}</span>
            <span>{statusLabel(focused.status)}</span>
          </>
        ) : (
          <span>{modules.length} modules · outer to inner</span>
        )}
      </figcaption>
      <ol className="visually-hidden">
        {modules.map((item) => (
          <li key={item.n}>
            <Link to={`/ring/${item.n}`}>
              Module {item.n}: {item.name}; ATT&amp;CK {item.attack.join(', ')};{' '}
              {statusLabel(item.status)}
            </Link>
          </li>
        ))}
      </ol>
    </figure>
  )
}
