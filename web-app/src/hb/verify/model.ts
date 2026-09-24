import type { VerificationObservation } from '../stores/verify'

// Lane 3 — the F5 verification grammar's DISPLAY derivation. The SHA-256 hash loop
// lives in main (core/hb/verifier, §4.1); the renderer MIRRORS its check/progress
// and check/result events. CHECKED binds ONLY to a live check/result{matched}
// (§4.3) — there are no cached verdicts and no renderer-side hashing.

export type VerifyPhase =
  | 'idle' // no check observed for this file
  | 'checking' // check/progress seen, no result yet (F5-A)
  | 'checked' // check/result{matched} — CHECKED (F5-B)
  | 'mismatch' // check/result{mismatched} (F5-C)
  | 'failed' // check/result{failed} — hash threw (F5-D)

export interface VerifyView {
  fileId: string
  phase: VerifyPhase
  pct: number | null
  fingerprintChecked: string | null
}

export function deriveVerify(fileId: string, obs: VerificationObservation | undefined): VerifyView {
  if (!obs || (!obs.progress && !obs.result)) {
    return { fileId, phase: 'idle', pct: null, fingerprintChecked: null }
  }
  const { result, progress } = obs
  if (result) {
    // A result always supersedes stale progress. fingerprintChecked is the id the
    // bytes were compared against (null on the no-fingerprint pre-check path).
    if (result.verdict === 'matched') {
      return { fileId, phase: 'checked', pct: 100, fingerprintChecked: result.fingerprintChecked }
    }
    const fingerprintChecked = 'fingerprintChecked' in result ? result.fingerprintChecked : null
    return { fileId, phase: result.verdict === 'mismatched' ? 'mismatch' : 'failed', pct: null, fingerprintChecked }
  }
  // Progress only — determinate bar driven by real bytesHashed/bytesTotal (A7:
  // never a timer, never an estimate).
  const pct = progress && progress.bytesTotal > 0
    ? Math.min(100, Math.round((progress.bytesHashed / progress.bytesTotal) * 100))
    : null
  return { fileId, phase: 'checking', pct, fingerprintChecked: null }
}

// The verdict binding, restated as a boolean gate for the engine-load / chat gate
// (§4.3 / G2B-35). True ONLY on a live matched result — never on progress alone.
export function isChecked(view: VerifyView): boolean {
  return view.phase === 'checked'
}
