import { useState } from 'react'
import { COPY } from '../copy'
import { MODELS, fitFor, gb, type Model } from '../data'
import { FitBadge } from '../components'

/* F2 — Discover / browse ("The Quiet Shelf"). 8/8 SHIP.
 * Cards: fit verdict (single fit object) -> purpose -> NOT-for -> one action.
 * Yellow fails OPEN; the machine-unknown guess stays dead. */
export function Discover({ onOpen }: { onOpen: (m: Model) => void }) {
  const [active, setActive] = useState<number | null>(3) // "Fits my computer ✓"

  return (
    <div>
      <h1 className="hb-title">{COPY.f2.hero}</h1>
      <div style={{ margin: '16px 0' }}>
        <input className="hb-input" placeholder={COPY.f2.search} aria-label="Search programs" />
      </div>
      <div className="hb-chips">
        {COPY.f2.chips.map((c, i) => (
          <button
            key={c}
            className={'hb-chip' + (active === i ? ' on' : '')}
            onClick={() => setActive(active === i ? null : i)}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {MODELS.map((m) => {
          const fit = fitFor(m)
          return (
            <div className="hb-card" key={m.id}>
              <h2 className="hb-headline">{m.name}</h2>
              <FitBadge fit={fit} model={m} />
              <p className="hb-body">{m.purposeLabel}</p>
              <p className="hb-body hb-secondary">{COPY.f3.notFor}</p>
              <p className="hb-body">{COPY.f2.purposeDefault}</p>
              <button className="hb-link-quiet" onClick={() => onOpen(m)}>
                {COPY.f2.aboutDownload} ({gb(m.sizeGB)}) ›
              </button>
            </div>
          )
        })}
      </div>

      <p className="hb-footnote" style={{ marginTop: 20 }}>
        {COPY.f2.s7Showing} · {COPY.f2.partial}
      </p>
    </div>
  )
}
