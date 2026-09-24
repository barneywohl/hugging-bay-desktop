import { COPY } from '../copy'

/* F10 — Settings ("The Short List"). Four rows: Downloads · Updates ·
 * What this app sends · About. Everything auto-detectable is not a setting.
 * "What this app sends" defaults to the gate-CLOSED verb-first line (O-F6):
 * the "nothing/never/ever" claim is FORBIDDEN until the proof ships. */
export function Settings() {
  const VERSION = '1.0.0'
  return (
    <div style={{ maxWidth: 640 }}>
      <h1 className="hb-title">Settings</h1>
      <p className="hb-body hb-secondary">
        Only a few things need your decision. Everything else, the app handles itself.
      </p>

      <div className="hb-card">
        <div className="hb-row">
          <span>Downloads</span>
          <span className="hb-secondary">This Mac ›</span>
        </div>
        <div className="hb-row">
          <span>Updates</span>
          <span className="hb-secondary">Automatic ›</span>
        </div>
        <div className="hb-row">
          <span>What this app sends</span>
          <span className="hb-secondary">See the proof ›</span>
        </div>
        <div className="hb-row">
          <span>About</span>
          <span className="hb-secondary">{VERSION} ›</span>
        </div>
      </div>

      {/* F10-5 What this app sends — gate CLOSED (default) */}
      <h2 className="hb-section-title">{COPY.f10.sends.titleClosed}</h2>
      <div className="hb-sunken">
        <p className="hb-body" style={{ margin: 0 }}>
          {COPY.f10.sends.closed}
        </p>
      </div>

      {/* F10-6 About — license obligation, verbatim */}
      <h2 className="hb-section-title">About</h2>
      <div className="hb-card">
        <p className="hb-headline">{COPY.f10.about.title(VERSION)}</p>
        <p className="hb-body">{COPY.f10.about.builtOn}</p>
        <p className="hb-body">{COPY.f10.about.fork}</p>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="https://github.com/barneywohl/hugging-bay-desktop/blob/main/CHANGES.md" target="_blank" rel="noreferrer">
            {COPY.f10.about.changed}
          </a>
          <a href="https://github.com/barneywohl/hugging-bay-desktop/blob/main/LICENSE" target="_blank" rel="noreferrer">
            {COPY.f10.about.license}
          </a>
        </div>
      </div>
    </div>
  )
}
