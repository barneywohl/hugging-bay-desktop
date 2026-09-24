import { useState } from 'react'
import { COPY } from '../../copy/strings'
import { useEngineStore } from '../../stores'
import { deriveEngine } from '../../engine'
import { EngineScreen } from '../engine'
import { EMPTY } from '../../lib/tokens'

// F6 — chat. The run indicator + F8 grammar come from EngineScreen (§5.6). The
// token stream itself is the localhost jan-llama-worker sidecar path (§5.9 lock 7),
// not built in this renderer lane — so this surface never fabricates a reply. The
// input is enabled only when a model is live; "running" is claimed only by the
// engine view on a real first token.
export function ChatScreen() {
  const value = useEngineStore((state) => state.value)
  const view = deriveEngine(value)
  const [draft, setDraft] = useState(EMPTY)

  return (
    <section className="hb-screen" data-phase={view.phase}>
      <EngineScreen />
      <h1>{COPY.f6.headline}</h1>
      <p className="hb-quiet">{COPY.f6.orientation}</p>
      <p className="hb-pill">{COPY.f6.pill}</p>
      <p className="hb-quiet">{COPY.f6.s2a}</p>
      <p className="hb-quiet">{COPY.f6.s2b}</p>
      <p className="hb-quiet">{COPY.f6.notFor}</p>
      {!view.live && <p role="status">{COPY.f6.tryLine}</p>}
      <textarea
        aria-label={COPY.shell.chat}
        placeholder={COPY.f6.placeholder}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        disabled={!view.live}
      />
      <button type="button" disabled={!view.live || draft.trim().length === 0}>
        {COPY.f6.send}
      </button>
    </section>
  )
}
