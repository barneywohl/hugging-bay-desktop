import { useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { COPY } from '../../copy/strings'
import { SpineContext } from '../../spine-context'
import { useCatalogStore, useFitStore } from '../../stores'
import { armDownload, useFitObject, formatSize } from '../../fit'
import { FitLine } from '../fit'
import { DownloadSource, EMPTY } from '../../lib/tokens'
import type { CatalogFile } from '../../ipc'

// F2 — "The Quiet Shelf". Renders the REAL catalog cache (main-owned truth) with
// a fit verdict per card. null catalog = never read; [] = a real empty catalog.
// The list is fail-closed: no fabricated models when the native catalog is absent.
export function DiscoverScreen() {
  const spine = useContext(SpineContext)
  const cache = useCatalogStore((state) => state.value)
  const error = useCatalogStore((state) => state.error)
  const [query, setQuery] = useState(EMPTY)

  // Local cache read only (no network) on mount — the zero-added-egress law.
  useEffect(() => {
    void spine?.readCatalog()
  }, [spine])

  const records = cache?.records ?? null
  const filtered = useMemo(() => {
    if (!records) return null
    const q = query.trim().toLowerCase()
    return q ? records.filter((r) => r.name.toLowerCase().includes(q)) : records
  }, [records, query])

  return (
    <section className="hb-screen" data-observed={records != null}>
      <h1>{COPY.f2.hero}</h1>
      <input
        type="search"
        aria-label={COPY.shell.discover}
        placeholder={COPY.f2.search}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {filtered == null && error && <p role="status">{COPY.f2.partial}</p>}
      {filtered != null && filtered.length === 0 && <p role="status">{COPY.f2.s3NoResults}</p>}
      <ul className="hb-shelf">
        {(filtered ?? []).map((file) => (
          <ModelCard key={file.fileId} file={file} siblings={records ?? []} />
        ))}
      </ul>
    </section>
  )
}

function ModelCard({ file, siblings }: { file: CatalogFile; siblings: readonly CatalogFile[] }) {
  const navigate = useNavigate()
  const family = useMemo(() => siblings.filter((s) => s.modelId === file.modelId), [siblings, file.modelId])
  const fit = useFitObject(file, family)
  const hardware = useFitStore((state) => state.value?.rawHardware ?? null)
  const [busy, setBusy] = useState(false)

  async function download() {
    setBusy(true)
    const outcome = await armDownload(
      { modelId: file.modelId, fileId: file.fileId, source: DownloadSource.catalog },
      { hardware, file, siblings: family }
    )
    setBusy(false)
    if (outcome.outcome === 'armed') void navigate({ to: '/downloads' })
  }

  return (
    <li className="hb-card" data-model={file.modelId}>
      <h2>{file.name}</h2>
      <p className="hb-quiet">{COPY.f2.purposeDefault}</p>
      <FitLine fit={fit} />
      <button
        type="button"
        onClick={() => void navigate({ to: '/models/$modelId', params: { modelId: file.modelId } })}
      >
        {COPY.f2.aboutDownload}
      </button>
      <button type="button" onClick={() => void download()} disabled={busy || fit?.verdict === 'no-fit'}>
        {COPY.f3.downloadCta(formatSize(file.bytes))}
      </button>
    </li>
  )
}
