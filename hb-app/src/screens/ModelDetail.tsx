import { COPY } from '../copy'
import { fitFor, gb, MODELS, type Model } from '../data'
import { FitBadge } from '../components'

/* F3 — Model detail ("The Verdict Screen"). 8/8 SHIP.
 * Fit verdict FIRST. The fit gate fires BEFORE download: a doomed download never
 * arms — there is no reachable download control on a too-big model (F3-S2). */
export function ModelDetail({
  model,
  onDownload,
  onSeeFits,
}: {
  model: Model
  onDownload: (m: Model) => void
  onSeeFits: () => void
}) {
  const fit = fitFor(model)
  const runs = fit === 'runs'
  const lighter = MODELS.filter((m) => m.id !== model.id && fitFor(m) === 'runs').sort(
    (a, b) => b.needGB - a.needGB
  )[0]

  return (
    <div>
      <h1 className="hb-title">{model.name}</h1>

      {/* Verdict first */}
      <FitBadge fit={fit} model={model} />
      <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
        <details className="hb-disc">
          <summary>{COPY.f3.howDoYouKnow}</summary>
          <p className="hb-caption">
            Needs about {model.needGB} GB; this Mac has 8 GB. We read this Mac&rsquo;s memory on
            this machine — we don&rsquo;t guess. If that&rsquo;s not your machine, re-open setup.
          </p>
        </details>
        <button className="hb-link-quiet">{COPY.f3.notMyMachine}</button>
      </div>

      {/* Purpose */}
      <h2 className="hb-section-title">Purpose</h2>
      <p className="hb-body">{model.purposeLabel}</p>
      <p className="hb-body hb-secondary">{COPY.f3.notFor}</p>
      <p className="hb-body">{COPY.f3.purposeDefault}</p>
      <p className="hb-body hb-secondary">{COPY.f3.tryLine}</p>

      {/* Action — fit gate: the only reachable CTA depends on the verdict */}
      {runs ? (
        <>
          <button className="hb-btn hb-btn-primary" onClick={() => onDownload(model)}>
            {COPY.f3.downloadCta(gb(model.sizeGB))}
          </button>
          <p className="hb-footnote" style={{ marginTop: 12 }}>
            {COPY.f3.reassurance}
          </p>
        </>
      ) : (
        <div className="hb-fit toobig" role="status">
          <p style={{ margin: '0 0 8px' }}>{COPY.f3.s2Rescue}</p>
          <button className="hb-link-quiet" onClick={onSeeFits} style={{ padding: 0 }}>
            {COPY.f3.s2See}
          </button>
          {lighter && (
            <p className="hb-body" style={{ marginTop: 10, color: 'var(--hb-text-primary)' }}>
              <button className="hb-btn hb-btn-primary" onClick={() => onDownload(lighter)}>
                {COPY.f3.lighter(gb(lighter.sizeGB))}
              </button>
            </p>
          )}
        </div>
      )}

      {/* Promise line (R7) */}
      <div className="hb-sunken" style={{ margin: '16px 0' }}>
        <p className="hb-body" style={{ margin: 0 }}>
          {COPY.f3.promise}
        </p>
      </div>

      {/* File identity — experts, behind a toggle; no hex on the default view */}
      <details className="hb-disc">
        <summary>{COPY.f3.fingerprintExperts}</summary>
        <p className="hb-mono">{model.fingerprintShort}</p>
        <p className="hb-caption">{COPY.f3.defaultFileNote}</p>
      </details>

      {/* Verification explainer — shown by default */}
      <div className="hb-divider" />
      <h2 className="hb-section-title">Verification explainer</h2>
      <div className="hb-sunken">
        <p className="hb-body" style={{ margin: 0 }}>
          {COPY.f3.verificationExplainer}
        </p>
      </div>
    </div>
  )
}
