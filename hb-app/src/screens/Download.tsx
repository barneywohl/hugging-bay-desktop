import { useEffect, useState } from 'react'
import { COPY } from '../copy'
import { gb, type Model } from '../data'
import { JourneyRail } from '../components'

/* F4 — Download (one surface, the journey rail). 8/8 SHIP.
 * Getting -> Checking -> Ready, always visible. The check is dissolved into
 * phase 2 of the same surface (F5 absorbed). One primary action. Never claims
 * the model is "safe" — only that the file arrived unchanged. */
export function Download({ model, onChat }: { model: Model; onChat: () => void }) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0)
  const [pct, setPct] = useState(0)

  // Single mount-driven sequence: Getting (0->100%) -> Checking -> Ready.
  // Kept in one effect so a phase change never cancels the next transition.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    const iv = setInterval(() => {
      setPct((p) => {
        const next = Math.min(100, p + 7)
        if (next >= 100) {
          clearInterval(iv)
          timers.push(setTimeout(() => setPhase(1), 500))
          timers.push(setTimeout(() => setPhase(2), 1900))
        }
        return next
      })
    }, 220)
    return () => {
      clearInterval(iv)
      timers.forEach(clearTimeout)
    }
  }, [])

  const total = gb(model.sizeGB)
  const got = gb(Number(((model.sizeGB * pct) / 100).toFixed(1)))
  const minsLeft = Math.max(1, Math.round((100 - pct) / 25))

  return (
    <div>
      <p className="hb-body">
        {COPY.f4.orientation(model.name, 'the small, fast version your computer can run', total)}
      </p>
      <details className="hb-disc">
        <summary>{COPY.f4.fileDetails}</summary>
        <p className="hb-mono">{model.fileId}</p>
      </details>

      <JourneyRail phase={phase} labels={COPY.f4.phases} />

      {phase === 0 && (
        <div role="status" aria-live="polite">
          <h1 className="hb-headline tabnum">{COPY.f4.getting(pct, got, total)}</h1>
          <p className="hb-caption tabnum">{pct >= 15 ? COPY.f4.eta(minsLeft) : ''}</p>
          <div className="hb-progress" aria-hidden>
            <div style={{ width: `${pct}%` }} />
          </div>
          <div className="hb-sunken">
            <p className="hb-body" style={{ margin: 0 }}>
              {COPY.f4.promise}
            </p>
          </div>
          <p className="hb-footnote" style={{ marginTop: 10 }}>
            {COPY.f4.background}
          </p>
        </div>
      )}

      {phase === 1 && (
        <div role="status" aria-live="polite">
          <h1 className="hb-headline">{COPY.f4.checking}</h1>
          <p className="hb-caption">{COPY.f4.checkingSub}</p>
        </div>
      )}

      {phase === 2 && (
        <div role="status" aria-live="polite">
          <div className="hb-fit runs">
            <p style={{ margin: 0 }}>{COPY.f4.readyChecked}</p>
          </div>
          <p className="hb-body hb-secondary">{COPY.f4.readyLimitation}</p>
          <button className="hb-btn hb-btn-primary" onClick={onChat}>
            {COPY.f4.start}
          </button>
        </div>
      )}
    </div>
  )
}
