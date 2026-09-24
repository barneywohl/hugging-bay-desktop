import { COPY } from '../../copy/strings'
import { useVerifyStore } from '../../stores'
import { deriveVerify, verifyControls } from '../../verify'

// F5 grammar (owned by verify/, imported by the F4 rail S14–S18 and F3-S3, §4.7).
// CHECKED renders ONLY from a live matched result. Fail-closed everywhere else.
const controls = verifyControls()

export function VerifyGrammar({ fileId }: { fileId: string }) {
  const obs = useVerifyStore((state) => state.value?.[fileId])
  const view = deriveVerify(fileId, obs)

  if (view.phase === 'idle') return null

  if (view.phase === 'checking') {
    return (
      <div className="hb-verify" data-phase="checking" aria-live="polite">
        {view.pct != null && <progress value={view.pct} max={100} />}
        <p>{COPY.f4.checking}</p>
        <p className="hb-quiet">{COPY.f4.checkingSub}</p>
      </div>
    )
  }
  if (view.phase === 'checked') {
    return (
      <div className="hb-verify" data-phase="checked">
        <p>{COPY.f3.s3Checked}</p>
        <p className="hb-quiet">{COPY.f3.s3Limitation}</p>
      </div>
    )
  }
  if (view.phase === 'mismatch') {
    return (
      <div className="hb-verify" data-phase="mismatch" role="alert">
        <p>{COPY.f4.mismatch}</p>
        <p className="hb-quiet">{COPY.f4.mismatchSub}</p>
        <button type="button">{COPY.f4.mismatchDelete}</button>
      </div>
    )
  }
  // failed — the honest "we don't know" state (never treated as checked).
  return (
    <div className="hb-verify" data-phase="failed" role="alert">
      <p>{COPY.f4.checkFailed}</p>
      <p className="hb-quiet">{COPY.f4.checkFailedSub}</p>
      <button type="button" onClick={() => void controls.recheck(fileId)}>{COPY.f4.checkFailedRetry}</button>
    </div>
  )
}

// Retained default export surface for the composition points that mount a bare
// verify region without a specific fileId yet.
export function VerifyScreen({ fileId }: { fileId?: string }) {
  return fileId ? <VerifyGrammar fileId={fileId} /> : null
}
