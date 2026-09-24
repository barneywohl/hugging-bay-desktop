import type { EventPayload } from '../ipc'
import { createMirror } from './mirror'

export interface EngineMirror {
  loaded: { modelId: string; fileId: string | null } | null
  phase: 'unknown' | 'starting' | 'running' | 'unloaded' | 'crashed' | 'oom'
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
export const selectRunningModel = (value: EngineMirror | null) => value?.phase === 'running' ? value.loaded : null
