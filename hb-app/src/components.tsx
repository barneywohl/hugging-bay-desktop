import { Fragment, type ReactNode } from 'react'
import { FIT } from './copy'
import type { Fit, Model } from './data'

export type Section = 'discover' | 'library' | 'downloads' | 'settings' | 'chat'

export function Sidebar(props: {
  active: Section
  onNav: (s: Section) => void
  theme: 'light' | 'dark'
  onTheme: () => void
}) {
  const items: { key: Section; label: string; glyph: string }[] = [
    { key: 'discover', label: 'Discover', glyph: '◈' },
    { key: 'library', label: 'Library', glyph: '▤' },
    { key: 'downloads', label: 'Downloads', glyph: '↓' },
    { key: 'settings', label: 'Settings', glyph: '⚙' },
  ]
  return (
    <aside className="hb-sidebar">
      <div className="hb-brand">
        {/* Pixel-faithful face crop — never restyled */}
        <img src="/hb/logo-face.png" alt="The Hugging Bay" />
        <span>The Hugging Bay</span>
      </div>
      <nav className="hb-nav">
        {items.map((it) => (
          <button
            key={it.key}
            className={props.active === it.key ? 'active' : ''}
            onClick={() => props.onNav(it.key)}
            aria-current={props.active === it.key ? 'page' : undefined}
          >
            <span className="glyph" aria-hidden>
              {it.glyph}
            </span>
            {it.label}
          </button>
        ))}
      </nav>
      <div className="hb-sidebar-foot">
        <button className="hb-theme-toggle" onClick={props.onTheme}>
          {props.theme === 'light' ? 'Dark' : 'Light'} appearance
        </button>
      </div>
    </aside>
  )
}

/* Fit verdict — the single fit object rendered verbatim (F2/F3/F8 all use this).
 * Verdict is words first; color is never the only signal. Yellow fails OPEN. */
export function FitBadge({ fit, model }: { fit: Fit; model: Model }) {
  if (fit === 'runs')
    return <div className="hb-fit runs">{FIT.runs(model.needGB, 8)}</div>
  if (fit === 'toobig')
    return <div className="hb-fit toobig">{FIT.tooBig(model.needGB, 8)}</div>
  return <div className="hb-fit unknown">{FIT.unknown}</div>
}

/* Journey rail: Getting -> Checking -> Ready. Marker is never color-only —
 * the label reads the phase name; done phases carry the check. */
export function JourneyRail({ phase, labels }: { phase: 0 | 1 | 2; labels: readonly string[] }) {
  return (
    <div className="hb-rail" role="group" aria-label="Download progress">
      {labels.map((label, i) => (
        <Fragment key={label}>
          {i > 0 && <div className="hb-rail-conn" aria-hidden />}
          <div className="hb-rail-step">
            <div
              className={
                'hb-rail-dot ' + (i < phase ? 'done' : i === phase ? 'active' : '')
              }
            >
              {i < phase ? '✓' : i + 1}
            </div>
            <div className="hb-rail-label">
              {label}
              {i === phase ? ' (current)' : ''}
            </div>
          </div>
        </Fragment>
      ))}
    </div>
  )
}

export function Content({
  children,
  width = 'detail',
}: {
  children: ReactNode
  width?: 'detail' | 'chat' | 'wide'
}) {
  const cls = width === 'chat' ? 'hb-content narrow' : width === 'wide' ? 'hb-content wide' : 'hb-content'
  return <div className={cls}>{children}</div>
}
