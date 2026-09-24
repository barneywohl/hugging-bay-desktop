import { useState } from 'react'
import { COPY } from '../copy'
import { gb, type Model } from '../data'

/* F7 — Library ("The Ledger"). Answers "where did 40 GB go?" in one sentence.
 * Delete = inline confirm, never a modal; byte-immediate, no undo on this surface
 * (re-download is the safety net). Sizes measured at render. */
export function Library({
  library,
  onChat,
  onDelete,
  onBrowse,
}: {
  library: Model[]
  onChat: (m: Model) => void
  onDelete: (m: Model) => void
  onBrowse: () => void
}) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const totalDisk = 512
  const used = Number(library.reduce((s, m) => s + m.sizeGB, 0).toFixed(1))
  const free = Number((totalDisk - used).toFixed(1))

  if (library.length === 0) {
    return (
      <div>
        <h1 className="hb-title">{COPY.f7.header}</h1>
        <div className="hb-card">
          <h2 className="hb-headline">{COPY.f7.l4}</h2>
          <p className="hb-body hb-secondary">{COPY.f7.l4Teach}</p>
          <button className="hb-btn hb-btn-primary" onClick={onBrowse}>
            {COPY.f4.dlEmptyBrowse}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="hb-title">{COPY.f7.header}</h1>
      <p className="hb-body hb-secondary">{COPY.f7.intro}</p>

      {/* Disk meter (hero) */}
      <div className="hb-card">
        <p className="hb-body tabnum" style={{ margin: 0 }}>
          {COPY.f7.meterUsed(gb(used), gb(totalDisk))}
        </p>
        <div className="hb-meter" aria-hidden>
          <div style={{ width: `${(used / totalDisk) * 100}%` }} />
        </div>
        <p className="hb-caption tabnum">{COPY.f7.meterFree(gb(free))}</p>
      </div>

      <div style={{ marginTop: 16 }}>
        {library.map((m) => (
          <div className="hb-card" key={m.id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 className="hb-headline" style={{ margin: 0 }}>
                {m.name}
              </h2>
              <span className="hb-caption tabnum">{gb(m.sizeGB)}</span>
            </div>
            <p className="hb-caption">{COPY.f7.neverOpened}</p>
            {confirming === m.id ? (
              <div className="hb-sunken" style={{ marginTop: 8 }} role="group" aria-label="Confirm delete">
                <p className="hb-body">{COPY.f7.l2(m.name, gb(m.sizeGB))}</p>
                <p className="hb-caption">{COPY.f7.l2Quiet}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    className="hb-btn hb-btn-secondary"
                    onClick={() => {
                      onDelete(m)
                      setConfirming(null)
                    }}
                  >
                    {COPY.f7.l2Delete}
                  </button>
                  <button className="hb-btn hb-btn-secondary" onClick={() => setConfirming(null)}>
                    {COPY.f7.l2Keep}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="hb-btn hb-btn-secondary" onClick={() => onChat(m)}>
                  {COPY.f7.chat}
                </button>
                <button className="hb-link-quiet" onClick={() => setConfirming(m.id)}>
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Storage card (quiet) */}
      <div className="hb-card" style={{ marginTop: 16 }}>
        <p className="hb-body">{COPY.f7.storageTitle}</p>
        <span className="hb-code">{COPY.f7.storagePath}</span>
        <p className="hb-caption" style={{ marginTop: 8 }}>
          {COPY.f7.storageTilde}
        </p>
      </div>
    </div>
  )
}
