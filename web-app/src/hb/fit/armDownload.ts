import { ipc, type FitObject, type HbClient, type HbError } from '../ipc'
import { computeFit, type FitInput } from './fitObject'
import { requiredBytes, DEFAULT_CTX_LENGTH } from './compat'

// §3.3: `armDownload` is the ONE entry point to downloads. F2 cards, F3 buttons,
// F9-B rows and shortlist opens all funnel through it. It never touches disk or
// network itself — it runs the FREE, INSTANT renderer-side gates (fit + the
// F3-side disk preflight) and then calls the typed `downloads.arm`, which owns
// the receipt write and the remaining gates (offline/metered/partial) in main.

export interface ArmRequest {
  modelId: string
  fileId: string
  source: string
  // Optional explicit fingerprint (e.g. a receipt replay); when absent the catalog
  // file's published fingerprint from the ArmContext is used.
  expectedFingerprint?: string | null
}

// Renderer-visible outcomes. `armed` is the only path that produced a task; every
// other outcome is fail-closed with the reason a screen renders verbatim grammar
// for. No outcome fabricates a task id or a "downloading" claim.
export type ArmOutcome =
  | { outcome: 'armed'; taskId: string }
  | { outcome: 'blocked-fit'; fit: FitObject } // F11 (b) — red verdict, rescue rides on fit
  | { outcome: 'blocked-space'; needBytes: number; freeBytes: number } // F3-S5 preflight
  | { outcome: 'error'; error: HbError }

export interface ArmContext {
  hardware: FitInput['hardware']
  // The catalog file. Its `expectedFingerprint` (the published SHA-256) rides
  // through arm so the verifier has a reference to match the downloaded bytes to.
  file: FitInput['file'] & { expectedFingerprint?: string | null }
  siblings?: FitInput['siblings']
  ctxLength?: number
}

export async function armDownload(
  request: ArmRequest,
  ctx: ArmContext,
  client: HbClient = ipc
): Promise<ArmOutcome> {
  const ctxLength = ctx.ctxLength ?? DEFAULT_CTX_LENGTH

  // Gate 2 (fit, F11). We do NOT block on 'unknown' — machine-unknown lets the
  // user proceed if they are sure (F3-S6). Only a computed 'no-fit' blocks.
  const fit = computeFit({ hardware: ctx.hardware, file: ctx.file, siblings: ctx.siblings, ctxLength })
  if (fit.verdict === 'no-fit') return { outcome: 'blocked-fit', fit }

  // Gate 6 (disk preflight, F3 side). Free, instant, prevents the "we can run it
  // but there's no room" reversal. Uses the same measured need as the fit object.
  const need = ctx.file.bytes > 0 ? requiredBytes(ctx.file.bytes, ctxLength) : null
  if (need != null) {
    const space = await client.storage.freeSpace()
    if (space.ok && space.value.bytes < ctx.file.bytes) {
      return { outcome: 'blocked-space', needBytes: ctx.file.bytes, freeBytes: space.value.bytes }
    }
    // A failed free-space probe does not fake a pass; it falls through to arm,
    // where main re-runs the preflight (§3.3 step 6, never cached) and fails closed.
  }

  // Carry the catalog's published fingerprint into the arm (§4.3). Omitted when the
  // record published none — the verifier then cannot claim a match rather than
  // inventing one. `request` may already carry an explicit fingerprint (a receipt
  // replay); that wins over the catalog default.
  const expectedFingerprint = request.expectedFingerprint ?? ctx.file.expectedFingerprint ?? undefined
  const armed = await client.downloads.arm(
    expectedFingerprint != null ? { ...request, expectedFingerprint } : request
  )
  if (!armed.ok) return { outcome: 'error', error: armed.error }
  return { outcome: 'armed', taskId: armed.value.taskId }
}
