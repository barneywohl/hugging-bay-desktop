import type { CheckResult, EventPayload } from '../ipc'
import { createMirror } from './mirror'

export interface VerificationObservation {
  progress: EventPayload<'check/progress'> | null
  result: CheckResult | null
}
export const verifyMirror = createMirror<Readonly<Record<string, VerificationObservation>>>()
export function receiveCheckProgress(payload: EventPayload<'check/progress'>) {
  const previous = verifyMirror.getSnapshot().value ?? {}
  // New hash progress invalidates an older verdict. Never reuse a cached CHECKED.
  verifyMirror.receive({ ...previous, [payload.fileId]: { progress: payload, result: null } })
}
export function receiveCheckResult(payload: CheckResult) {
  const previous = verifyMirror.getSnapshot().value ?? {}
  verifyMirror.receive({ ...previous, [payload.fileId]: { progress: null, result: payload } })
}
export function invalidateCheck(fileId: string) {
  const previous = verifyMirror.getSnapshot().value ?? {}
  verifyMirror.receive({ ...previous, [fileId]: { progress: null, result: null } })
}
// verify.status can gate a press, but only the live check/result event feeds this.
export const selectChecked = (entry: VerificationObservation | undefined) => entry?.result?.verdict === 'matched'
