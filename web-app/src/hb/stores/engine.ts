import type { EventPayload } from '../ipc'
import { createMirror } from './mirror'

export interface EngineMirror {
  loaded: { modelId: string; fileId: string | null } | null
  // 'ready' = loaded and live (the F8-IND liveness dot) but NO token yet.
  // 'running' is reached ONLY on a real engine/first-token event (see below).
  phase: 'unknown' | 'starting' | 'ready' | 'running' | 'unloaded' | 'crashed' | 'oom'
  starting: EventPayload<'engine/starting'> | null
  oom: EventPayload<'engine/oom'> | null
  crashed: EventPayload<'engine/crashed'> | null
  firstToken: EventPayload<'engine/first-token'> | null
  progress: EventPayload<'engine/progress'> | null
  pressure: EventPayload<'engine/pressure'> | null
  offload: EventPayload<'engine/offload'> | null
}
export const engineMirror = createMirror<EngineMirror>()
export const blankEngine = (): EngineMirror => ({ loaded: null, phase: 'unknown', starting: null, oom: null, crashed: null, firstToken: null, progress: null, pressure: null, offload: null })
export function receiveEngine(change: Partial<EngineMirror>) {
  engineMirror.receive({ ...(engineMirror.getSnapshot().value ?? blankEngine()), ...change })
}
// "It's running" — the F6 claim — is TRUE only after a real first token (§5.1).
export const selectRunningModel = (value: EngineMirror | null) => value?.phase === 'running' ? value.loaded : null
// The F8-IND liveness dot: a model is loaded/live (ready or running), a weaker,
// honest claim than "running". Cleared within 1s of an external kill (§5.9 lock 6).
export const selectLoadedModel = (value: EngineMirror | null) =>
  value && (value.phase === 'ready' || value.phase === 'running') ? value.loaded : null
export const selectFirstTokenSeen = (value: EngineMirror | null) => value?.firstToken != null
