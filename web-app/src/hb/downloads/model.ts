import type { DownloadState } from '../ipc'
import type { DownloadObservation } from '../stores/download'

// Lane 2 — the F4 rail's DISPLAY derivation. The 19-state machine (§3.1) and every
// transition live in main; the renderer MIRRORS. This module turns the raw observed
// events (download/state.to + progress/eta/resume) into a view the F4-D1 surface
// renders. It invents NOTHING: pct only when the total is known, eta only when the
// core said it was earned, "resumed" only from a real download/resumed event.

// The single-journey rail: Getting → Checking → Ready (F4 phases). Plus the honest
// off-rail phases the copy has grammar for.
export type RailPhase =
  | 'idle' // no state observed yet
  | 'queued' // S1 queued / S19 blocked-queue-full
  | 'getting' // S2–S13 (connecting…notify)
  | 'checking' // S14–S16 (verifying)
  | 'ready' // S17 verified
  | 'failed-check' // S18
  | 'canceled' // C1A / C2E

export type StallReason = 'slow' | 'stall' | 'offline' | 'space' | 'metered' | null

export interface DownloadView {
  taskId: string
  state: DownloadState | null
  phase: RailPhase
  bytesReceived: number | null
  totalBytes: number | null
  pct: number | null
  speedBps: number | null
  etaMinutes: number | null
  reason: StallReason
  // C4 auto-resume beat (§3.4): the state a resume picked up from, if any.
  resumedFrom: DownloadState | null
  checkVerdict: 'matched' | 'mismatched' | 'failed' | null
  paused: boolean
  terminal: boolean
}

const GETTING: ReadonlySet<DownloadState> = new Set([
  'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13',
])
const CHECKING: ReadonlySet<DownloadState> = new Set(['S14', 'S15', 'S16'])
const QUEUED: ReadonlySet<DownloadState> = new Set(['S0', 'S1', 'S19'])
const PAUSED: ReadonlySet<DownloadState> = new Set(['S6', 'S8'])
// Terminal-failed states: the rail has stopped and needs a user action.
const TERMINAL: ReadonlySet<DownloadState> = new Set(['S18', 'C1A', 'C2E'])

function phaseOf(state: DownloadState | null): RailPhase {
  if (state == null) return 'idle'
  if (state === 'S17') return 'ready'
  if (state === 'S18') return 'failed-check'
  if (state === 'C1A' || state === 'C2E') return 'canceled'
  if (CHECKING.has(state)) return 'checking'
  if (QUEUED.has(state)) return 'queued'
  if (GETTING.has(state)) return 'getting'
  return 'idle'
}

function reasonOf(state: DownloadState | null, obs: DownloadObservation): StallReason {
  if (state === 'S5') return 'slow'
  if (state === 'S11' || state === 'S6') return 'stall'
  if (state === 'S9') return 'offline'
  if (state === 'S10') return 'space'
  if (state === 'S13') return 'metered'
  // Fall back to the last discrete signal event if the state is mid-transition.
  if (obs['download/space']) return 'space'
  if (obs['download/lost']) return 'offline'
  if (obs['download/metered']) return 'metered'
  if (obs['download/stall']) return 'stall'
  if (obs['download/slow']) return 'slow'
  return null
}

export function deriveTask(taskId: string, obs: DownloadObservation | undefined): DownloadView {
  const empty: DownloadView = {
    taskId, state: null, phase: 'idle', bytesReceived: null, totalBytes: null, pct: null,
    speedBps: null, etaMinutes: null, reason: null, resumedFrom: null, checkVerdict: null,
    paused: false, terminal: false,
  }
  if (!obs) return empty

  const state = obs['download/state']?.to ?? null
  const progress = obs['download/progress'] ?? null
  const bytesReceived = progress?.bytesReceived ?? obs['download/checkpoint']?.bytesReceived ?? null
  const totalBytes = progress && progress.totalBytes > 0 ? progress.totalBytes : null
  // Earned numbers only (§0.6 law 5 / §3.6): pct needs a real total; eta needs a
  // real speed AND the core's "earned" verdict — never a silent estimate.
  const pct = bytesReceived != null && totalBytes != null && totalBytes > 0
    ? Math.min(100, Math.round((bytesReceived / totalBytes) * 100))
    : null
  const speedBps = progress?.speedBps ?? null
  const earned = obs['download/etawatch']?.verdict === 'earned'
  const etaMinutes = earned && speedBps && speedBps > 0 && totalBytes != null && bytesReceived != null
    ? Math.max(1, Math.round((totalBytes - bytesReceived) / speedBps / 60))
    : null

  const completed = obs['download/completed'] ?? null
  const checkVerdict = state === 'S17'
    ? 'matched'
    : state === 'S18'
      ? (obs['download/failed'] ? 'failed' : 'mismatched')
      : completed
        ? null
        : null

  return {
    taskId,
    state,
    phase: phaseOf(state),
    bytesReceived,
    totalBytes,
    pct,
    speedBps,
    etaMinutes,
    reason: reasonOf(state, obs),
    resumedFrom: obs['download/resumed']?.fromState ?? null,
    checkVerdict,
    paused: state != null && PAUSED.has(state),
    terminal: state != null && TERMINAL.has(state),
  }
}

export function deriveAll(mirror: Readonly<Record<string, DownloadObservation>> | null): DownloadView[] {
  if (!mirror) return []
  return Object.entries(mirror).map(([taskId, obs]) => deriveTask(taskId, obs))
}
