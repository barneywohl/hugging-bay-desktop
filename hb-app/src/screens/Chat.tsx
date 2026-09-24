import { useState } from 'react'
import { COPY } from '../copy'
import { MODELS, fitFor, type Model } from '../data'

/* F6 — Chat (7/8 CONDITIONAL). The payoff screen: download-to-chat is one tap.
 * F8 owns the running indicator + switcher; F6 renders them verbatim.
 * The "nothing you type ever leaves it" line is FORBIDDEN until the proof ships. */
export function Chat({ model, onSwitch }: { model: Model; onSwitch: (m: Model) => void }) {
  const [messages, setMessages] = useState<{ who: 'user' | 'ai'; text: string }[]>([])
  const [draft, setDraft] = useState('')
  const [pillOpen, setPillOpen] = useState(false)
  const [switcher, setSwitcher] = useState(false)

  function send() {
    const t = draft.trim()
    if (!t) return // empty send = deliberate no-op
    setMessages((m) => [
      ...m,
      { who: 'user', text: t },
      { who: 'ai', text: '(This is the model running locally on this Mac — sample reply.)' },
    ])
    setDraft('')
  }

  return (
    <div>
      {/* F8-IND running indicator — always visible, 48px target, opens switcher */}
      <button
        className="hb-indicator"
        style={{ width: '100%', cursor: 'pointer', font: 'inherit' }}
        onClick={() => setSwitcher(true)}
      >
        <span className="dot" aria-hidden>
          ●
        </span>
        <strong>{model.name} is running</strong>
      </button>
      <p className="hb-caption" style={{ margin: '8px 0 16px' }}>
        {COPY.f6.orientation}
      </p>

      {messages.length === 0 ? (
        <>
          <h1 className="hb-display">{COPY.f6.headline}</h1>
          <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
            <input
              className="hb-input"
              placeholder={COPY.f6.placeholder}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              aria-label="Ask anything"
            />
            <button className="hb-btn hb-btn-primary" onClick={send}>
              {COPY.f6.send}
            </button>
          </div>
          <p className="hb-body hb-secondary">{COPY.f6.tryLine}</p>
        </>
      ) : (
        <>
          <div className="hb-chat-thread">
            {messages.map((m, i) =>
              m.who === 'user' ? (
                <div className="hb-bubble-user" key={i}>
                  {m.text}
                </div>
              ) : (
                <div className="hb-bubble-ai" key={i}>
                  {m.text}
                </div>
              )
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              className="hb-input"
              placeholder={COPY.f6.placeholder}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              aria-label="Ask anything"
            />
            <button className="hb-btn hb-btn-primary" onClick={send}>
              {COPY.f6.send}
            </button>
          </div>
        </>
      )}

      {/* Privacy pill */}
      <div style={{ marginTop: 16 }}>
        <button
          className="hb-chip"
          style={{ borderRadius: 999 }}
          onClick={() => setPillOpen((v) => !v)}
        >
          {COPY.f6.pill}
        </button>
        {pillOpen && (
          <div className="hb-sunken" style={{ marginTop: 8 }}>
            <p className="hb-body">{COPY.f6.s2a}</p>
            <p className="hb-body" style={{ margin: 0 }}>
              {COPY.f6.s2b}
            </p>
          </div>
        )}
      </div>

      {/* Bottom line (O-P13) — empty states only */}
      {messages.length === 0 && (
        <p className="hb-body hb-secondary" style={{ marginTop: 16 }}>
          {COPY.f6.notFor}
        </p>
      )}

      {/* F8-S4 switcher sheet — a sheet, never a modal popup */}
      {switcher && (
        <div className="hb-sheet-backdrop" onClick={() => setSwitcher(false)}>
          <div className="hb-sheet" role="dialog" aria-label="Choose a model" onClick={(e) => e.stopPropagation()}>
            <h2 className="hb-headline">Choose a model</h2>
            {MODELS.map((m) => {
              const fit = fitFor(m)
              const verdict = fit === 'runs' ? 'Runs on this Mac' : 'Too big for this Mac'
              const current = m.id === model.id
              return (
                <button
                  key={m.id}
                  className={'hb-switch-row' + (current ? ' current' : '')}
                  style={{ width: '100%', border: 'none', background: 'none', font: 'inherit', cursor: fit === 'runs' ? 'pointer' : 'not-allowed', textAlign: 'left' }}
                  disabled={fit !== 'runs'}
                  onClick={() => {
                    if (fit !== 'runs') return
                    onSwitch(m)
                    setSwitcher(false)
                  }}
                >
                  <span>
                    <strong>{m.name}</strong> / {verdict}
                  </span>
                  {current && <span className="hb-caption">{COPY.f8.runningNow}</span>}
                </button>
              )
            })}
            <div className="hb-divider" />
            <button className="hb-link-quiet">{COPY.f8.switcherGetMore} →</button>
          </div>
        </div>
      )}
    </div>
  )
}
