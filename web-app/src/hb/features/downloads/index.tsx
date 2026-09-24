import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { COPY } from '../../copy/strings'
import { useDownloadStore } from '../../stores'
import { deriveAll, downloadControls, type DownloadView } from '../../downloads'
import { formatSize } from '../../fit'

// F4 — the single journey rail (Getting → Checking → Ready). Rows are a projection
// of the download mirror; all transitions originate in main (§3.8). No timer
// animation — bars are driven by real download/progress events only. Every line
// is F4 copy; states without locked copy surface no invented text.
const controls = downloadControls()

export function DownloadsScreen() {
  const mirror = useDownloadStore((state) => state.value)
  const rows = deriveAll(mirror).filter((row) => row.phase !== 'idle' && row.phase !== 'canceled')

  return (
    <section className="hb-screen" data-observed={mirror != null}>
      <h1>{COPY.shell.downloads}</h1>
      {rows.length === 0 && <Empty />}
      <ul className="hb-rail">
        {rows.map((row) => (
          <li key={row.taskId} className="hb-rail-row" data-state={row.state ?? undefined} data-phase={row.phase}>
            <RailRow view={row} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function Empty() {
  const navigate = useNavigate()
  return (
    <div className="hb-empty">
      <p>{COPY.f4.dlEmpty}</p>
      <button type="button" onClick={() => void navigate({ to: '/discover' })}>{COPY.f4.dlEmptyBrowse}</button>
    </div>
  )
}

function RailRow({ view }: { view: DownloadView }) {
  // C4 auto-resume beat — narrated once when a resume just happened (§3.4).
  const resumedBeat = view.resumedFrom != null ? <p className="hb-quiet" role="status">{COPY.f4.s5Resume}</p> : null

  if (view.phase === 'ready') {
    return (
      <>
        <p>{COPY.f4.readyChecked}</p>
        <p className="hb-quiet">{COPY.f4.readyLimitation}</p>
        <button type="button">{COPY.f4.start}</button>
      </>
    )
  }
  if (view.phase === 'checking') {
    return (
      <>
        <p aria-live="polite">{COPY.f4.checking}</p>
        <p className="hb-quiet">{COPY.f4.checkingSub}</p>
      </>
    )
  }
  if (view.phase === 'failed-check') {
    if (view.checkVerdict === 'mismatched') {
      return (
        <>
          <p role="alert">{COPY.f4.mismatch}</p>
          <p className="hb-quiet">{COPY.f4.mismatchSub}</p>
          <button type="button">{COPY.f4.mismatchDelete}</button>
        </>
      )
    }
    return (
      <>
        <p role="alert">{COPY.f4.checkFailed}</p>
        <p className="hb-quiet">{COPY.f4.checkFailedSub}</p>
        <button type="button" onClick={() => void controls.retry(view.taskId)}>{COPY.f4.checkFailedRetry}</button>
      </>
    )
  }
  if (view.phase === 'queued') {
    return <p aria-live="polite">{COPY.f4.s19}</p>
  }

  // phase === 'getting' — the many honest sub-states.
  return <Getting view={view} beat={resumedBeat} />
}

function Getting({ view, beat }: { view: DownloadView; beat: ReactNode }) {
  const got = formatSize(view.bytesReceived ?? 0)
  const total = formatSize(view.totalBytes ?? 0)
  const pct = view.pct ?? 0

  if (view.reason === 'space') {
    return (
      <>
        <p role="alert">{COPY.f4.s8}</p>
        <p className="hb-quiet">{COPY.f4.s8Sub(got, total)}</p>
      </>
    )
  }
  if (view.reason === 'metered') {
    return (
      <>
        <p>{COPY.f4.s13(total)}</p>
        <button type="button" onClick={() => void controls.pause(view.taskId)}>{COPY.f4.s13Wait}</button>
        <button type="button" onClick={() => void controls.resume(view.taskId)}>{COPY.f4.s13Anyway}</button>
      </>
    )
  }
  if (view.reason === 'stall') {
    return (
      <>
        <p aria-live="polite">{COPY.f4.s5}</p>
        <p className="hb-quiet">{COPY.f4.s5Saved(got, total)}</p>
        <button type="button" onClick={() => void controls.resume(view.taskId)}>{COPY.f4.s5Resume}</button>
      </>
    )
  }
  if (view.paused) {
    return (
      <>
        <p>{COPY.f4.s7(pct, got, total)}</p>
        <button type="button" onClick={() => void controls.resume(view.taskId)}>{COPY.f4.s7Resume(pct)}</button>
      </>
    )
  }
  if (view.reason === 'slow' || view.pct == null) {
    // Speed unsteady/unknown — no time estimate, no spinner (S4).
    return (
      <>
        {beat}
        <p aria-live="polite">{COPY.f4.s4}</p>
      </>
    )
  }
  // Healthy downloading with a real percentage.
  return (
    <>
      {beat}
      <progress value={pct} max={100} />
      <p aria-live="polite">{COPY.f4.getting(pct, got, total)}</p>
      {view.etaMinutes != null && <p className="hb-quiet">{COPY.f4.eta(view.etaMinutes)}</p>}
      <p className="hb-quiet">{COPY.f4.background}</p>
    </>
  )
}
