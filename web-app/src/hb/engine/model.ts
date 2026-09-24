import type { EngineMirror } from '../stores/engine'

// Lane 4 — the F8/F6 engine DISPLAY derivation. The engine is tauri-plugin-llamacpp
// (real, inherited); the renderer mirrors its lifecycle events. The ONE claim this
// module guards: `running` is true only after a real first token (§5.1) — a loaded
// model that has produced nothing is `live` (the IND dot), never "running".

export interface EngineView {
  phase: EngineMirror['phase']
  model: { modelId: string; fileId: string | null } | null
  running: boolean
  live: boolean
  firstTokenSeen: boolean
  progressStage: string | null
  oom: { modelId: string; biggestThatFits: { modelId: string; fileId: string } } | null
  crashedKind: 'generic' | 'killed-externally' | null
  pressureHigh: boolean
}

export function deriveEngine(value: EngineMirror | null): EngineView {
  if (!value) {
    return {
      phase: 'unknown', model: null, running: false, live: false, firstTokenSeen: false,
      progressStage: null, oom: null, crashedKind: null, pressureHigh: false,
    }
  }
  const running = value.phase === 'running'
  const live = value.phase === 'ready' || value.phase === 'running'
  return {
    phase: value.phase,
    model: value.loaded,
    running,
    live,
    // A first-token record only counts while the session is live — a crash/unload
    // clears the loaded model, and `running` is gated on phase, not this flag.
    firstTokenSeen: value.firstToken != null,
    progressStage: value.progress?.stage ?? null,
    oom: value.oom ? { modelId: value.oom.modelId, biggestThatFits: value.oom.biggestThatFits } : null,
    crashedKind: value.phase === 'crashed' ? (value.crashed?.kind ?? 'generic') : null,
    pressureHigh: value.pressure?.level === 'high',
  }
}
