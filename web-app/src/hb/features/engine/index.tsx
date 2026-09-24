import { COPY } from '../../copy/strings'
import { useEngineStore } from '../../stores'
import { deriveEngine } from '../../engine'

// F8 grammar (owned by engine/, rendered in F6's chat area verbatim, §5.4). A pure
// projection of the engine mirror. The "● running" claim appears ONLY when the
// engine view says running (a real first token has streamed).
export function EngineScreen() {
  const value = useEngineStore((state) => state.value)
  const view = deriveEngine(value)

  if (view.running && view.model) {
    return <p className="hb-engine" data-phase="running" role="status">{COPY.f6.running(view.model.modelId)}</p>
  }
  if (view.oom) {
    const rescue = view.oom.biggestThatFits
    return (
      <div className="hb-engine" data-phase="oom" role="alert">
        <p>{COPY.f8.s5Head}</p>
        <p>{COPY.f8.s5Body(view.oom.modelId)}</p>
        <p className="hb-quiet">{COPY.f8.s5Bridge}</p>
        <button type="button">{COPY.f8.s5Cta(rescue.modelId)}</button>
      </div>
    )
  }
  if (view.crashedKind && view.model) {
    return (
      <div className="hb-engine" data-phase="crashed" role="alert">
        <p>{COPY.f6.s8(view.model.modelId)}</p>
        <p className="hb-quiet">{COPY.f6.s8Sub}</p>
        <button type="button">{COPY.f6.s8Start}</button>
      </div>
    )
  }
  if (view.pressureHigh && view.model) {
    return <p className="hb-engine" data-phase="pressure" role="status">{COPY.f8.s6(view.model.modelId)}</p>
  }
  if (view.live) {
    // Loaded and live, but not yet "running" — the honest in-between (F8-IND dot
    // is on; no "it's running" claim until the first token).
    return <p className="hb-engine" data-phase="ready" role="status">{COPY.f6.pill}</p>
  }
  return null
}
