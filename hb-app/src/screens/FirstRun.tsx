import { useEffect, useState } from 'react'
import { COPY } from '../copy'

/* F1 — First-run / onboarding ("The Quiet Minute"). SHIP.
 * S1 welcome -> S2 checking (staged narration, in place) -> S3 result.
 * One primary action per screen; no modal popups; the check runs on-device. */
export function FirstRun({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<'welcome' | 'checking' | 'result'>('welcome')
  const [checks, setChecks] = useState(0)

  useEffect(() => {
    if (step !== 'checking') return
    setChecks(0)
    const t1 = setTimeout(() => setChecks(1), 500)
    const t2 = setTimeout(() => setChecks(2), 1000)
    const t3 = setTimeout(() => setChecks(3), 1500)
    const t4 = setTimeout(() => setStep('result'), 2100)
    return () => [t1, t2, t3, t4].forEach(clearTimeout)
  }, [step])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 64 }}>
      <div className="hb-card" style={{ width: 560, maxWidth: 'calc(100vw - 48px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <img
            src="/hb/logo-face.png"
            alt="The Hugging Bay"
            style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', objectPosition: '34% 50%' }}
          />
          <strong>The Hugging Bay</strong>
        </div>

        {step === 'welcome' && (
          <>
            <h1 className="hb-display">{COPY.f1.s1.welcome}</h1>
            <p className="hb-body">{COPY.f1.s1.tagline}</p>
            <p className="hb-body hb-secondary">{COPY.f1.s1.body}</p>
            <button className="hb-btn hb-btn-primary" onClick={() => setStep('checking')}>
              {COPY.f1.s1.primary}
            </button>
            <p className="hb-footnote" style={{ marginTop: 12 }}>
              {COPY.f1.s1.quiet}
            </p>
          </>
        )}

        {step === 'checking' && (
          <>
            <h1 className="hb-headline">{COPY.f1.s2.checking}</h1>
            <p className="hb-body hb-secondary">{COPY.f1.s2.soWeOnly}</p>
            <div role="status" aria-live="polite" style={{ margin: '12px 0' }}>
              {checks >= 1 && <p className="hb-body">{COPY.f1.s2.readingMemory}</p>}
              {checks >= 2 && <p className="hb-body">{COPY.f1.s2.readingChip}</p>}
              {checks >= 3 && <p className="hb-body">{COPY.f1.s2.figuring}</p>}
            </div>
            <p className="hb-caption">{COPY.f1.s2.takesSeconds}</p>
            <p className="hb-caption" style={{ marginTop: 10 }}>
              {COPY.f1.s2.tooLong}{' '}
              <button className="hb-link-quiet" onClick={() => onDone()}>
                {COPY.f1.s2.skip}
              </button>
            </p>
            <div className="hb-sunken" style={{ marginTop: 12 }}>
              <p className="hb-caption" style={{ margin: 0 }}>
                {COPY.f1.s2.offline}
              </p>
            </div>
          </>
        )}

        {step === 'result' && (
          <>
            <h1 className="hb-headline">{COPY.f1.s3.headline}</h1>
            <div className="hb-sunken" style={{ margin: '12px 0' }}>
              <p className="hb-body" style={{ margin: 0 }}>
                {COPY.f1.s3.memory}
              </p>
            </div>
            <details className="hb-disc">
              <summary>{COPY.f1.s3.whatDidYouCheck}</summary>
              <p className="hb-caption">{COPY.f1.s3.whatDidYouCheckAnswer}</p>
            </details>
            <p className="hb-body hb-secondary" style={{ marginTop: 12 }}>
              {COPY.f1.s3.weak}
            </p>
            <button className="hb-btn hb-btn-primary" onClick={onDone}>
              {COPY.f1.s3.primary}
            </button>
            <p className="hb-footnote" style={{ marginTop: 16 }}>
              {COPY.f1.s3.carryOver}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
