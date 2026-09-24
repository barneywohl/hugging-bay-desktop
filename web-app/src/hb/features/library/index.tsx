import { useContext, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { COPY } from '../../copy/strings'
import { SpineContext } from '../../spine-context'
import { useLibraryStore } from '../../stores'
import { deriveLibrary, libraryControls, type LibraryRow } from '../../library'
import { formatSize } from '../../fit'

// F7 — "The Ledger". Everything downloaded, real sizes, nothing hidden. Rows are a
// projection of the library mirror (core scans <data>/models); the storage figure
// is a real free-space read. No fabrication: an unread mirror renders nothing (not
// an empty library), a delete only claims freed space the core actually freed, and
// "recently deleted" holds only what THIS session observed being deleted.
const controls = libraryControls()

interface Deleted { modelId: string; size: number }

export function LibraryScreen() {
  const spine = useContext(SpineContext)
  const records = useLibraryStore((state) => state.value)
  const error = useLibraryStore((state) => state.error)
  const view = deriveLibrary(records)
  const [freeBytes, setFreeBytes] = useState<number | null>(null)
  const [deleted, setDeleted] = useState<Deleted[]>([])
  const [announce, setAnnounce] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void spine?.refreshLibrary()
    void controls.freeSpace().then((r) => { if (live && r.ok) setFreeBytes(r.value.bytes) })
    return () => { live = false }
  }, [spine])

  // L7 — the folder is unreachable. The list is safe; nothing was deleted.
  if (error) {
    return (
      <section className="hb-screen" data-phase="unreachable">
        <h1>{COPY.f7.header}</h1>
        <p role="alert">{COPY.f7.l7}</p>
        <p className="hb-quiet">{COPY.f7.l7Sub}</p>
        <button type="button" onClick={() => void spine?.refreshLibrary()}>{COPY.f7.l7Locate}</button>
      </section>
    )
  }

  async function remove(modelId: string, size: number) {
    const result = await controls.delete(modelId)
    if (result.ok) {
      setDeleted((prev) => [{ modelId, size }, ...prev])
      setAnnounce(COPY.f7.l2Announce(modelId, formatSize(size)))
      await spine?.refreshLibrary()
      const free = await controls.freeSpace()
      if (free.ok) setFreeBytes(free.value.bytes)
    }
  }
  async function restore(modelId: string) {
    const result = await controls.restore(modelId)
    if (result.ok) {
      setDeleted((prev) => prev.filter((d) => d.modelId !== modelId))
      await spine?.refreshLibrary()
    }
  }

  return (
    <section className="hb-screen" data-observed={records != null}>
      <h1>{COPY.f7.header}</h1>
      <p className="hb-quiet">{COPY.f7.intro}</p>
      {freeBytes != null && <p className="hb-quiet">{COPY.f7.meterFree(formatSize(freeBytes))}</p>}
      {announce && <p role="status" className="hb-quiet">{announce}</p>}

      {view.empty ? (
        <Empty />
      ) : (
        <ul className="hb-ledger">
          {view.rows?.map((row) => (
            <li key={row.fileId} className="hb-ledger-row" data-model={row.modelId}>
              <Row row={row} onRemove={remove} />
            </li>
          ))}
        </ul>
      )}

      {deleted.length > 0 && (
        <div className="hb-recently-deleted">
          <p className="hb-quiet">{COPY.f7.l3}</p>
          <ul>
            {deleted.map((d) => (
              <li key={d.modelId} data-model={d.modelId}>
                <span>{d.modelId}</span>
                <button type="button" onClick={() => void restore(d.modelId)}>{COPY.f7.l3Again}</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Storage />
    </section>
  )
}

function Row({ row, onRemove }: { row: LibraryRow; onRemove: (id: string, size: number) => void }) {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  return (
    <>
      <span className="hb-ledger-name">{row.modelId}</span>
      <span className="hb-quiet">{COPY.f7.rowSize(formatSize(row.size))}</span>
      <span className="hb-quiet">{row.lastOpenedAt ? COPY.f7.lastOpened(row.lastOpenedAt) : COPY.f7.neverOpened}</span>
      <button type="button" onClick={() => void navigate({ to: '/chat' })}>{COPY.f7.chat}</button>
      {confirming ? (
        // L2 — inline confirm, never a modal. It states the space delete frees.
        <div className="hb-inline-confirm" role="group">
          <p>{COPY.f7.l2(row.modelId, formatSize(row.size))}</p>
          <p className="hb-quiet">{COPY.f7.l2Quiet}</p>
          <button type="button" onClick={() => { setConfirming(false); onRemove(row.modelId, row.size) }}>{COPY.f7.l2Delete}</button>
          <button type="button" onClick={() => setConfirming(false)}>{COPY.f7.l2Keep}</button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)}>{COPY.f7.l2Delete}</button>
      )}
    </>
  )
}

function Empty() {
  const navigate = useNavigate()
  return (
    <div className="hb-empty">
      <p>{COPY.f7.l4}</p>
      <p className="hb-quiet">{COPY.f7.l4Teach}</p>
      <button type="button" onClick={() => void navigate({ to: '/discover' })}>{COPY.f4.dlEmptyBrowse}</button>
    </div>
  )
}

function Storage() {
  return (
    <div className="hb-storage-note">
      <p>{COPY.f7.storageTitle}</p>
      <code>{COPY.f7.storagePath}</code>
      <p className="hb-quiet">{COPY.f7.storageTilde}</p>
    </div>
  )
}
