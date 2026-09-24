import { useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { COPY } from '../../copy/strings'
import { SpineContext } from '../../spine-context'
import { useCatalogStore, useFitStore } from '../../stores'
import { armDownload, useFitObject, formatSize } from '../../fit'
import { FitLine } from '../fit'
import { DownloadSource } from '../../lib/tokens'
import type { ArmOutcome } from '../../fit'

// F3 — "The Verdict Screen" (fit-first). The fit verdict renders BEFORE the CTA
// (verdict-before-CTA, §5.8). One default file per model; its siblings feed the
// rescue. No fabricated verdict: machine-unknown shows the honest F3-S6 ack.
export function ModelDetailScreen() {
  const spine = useContext(SpineContext)
  const navigate = useNavigate()
  const { modelId } = useParams({ from: '/models/$modelId' })
  const cache = useCatalogStore((state) => state.value)
  const hardware = useFitStore((state) => state.value?.rawHardware ?? null)
  const [outcome, setOutcome] = useState<ArmOutcome | null>(null)

  useEffect(() => {
    void spine?.readCatalog()
  }, [spine])

  const family = useMemo(
    () => (cache?.records ?? []).filter((r) => r.modelId === modelId),
    [cache, modelId]
  )
  // Default file = the biggest that fits, else the first listed (F3 default note).
  const file = family[0] ?? null
  const fit = useFitObject(file, family)

  async function download() {
    if (!file) return
    const result = await armDownload(
      { modelId, fileId: file.fileId, source: DownloadSource.modelDetail },
      { hardware, file, siblings: family }
    )
    setOutcome(result)
    if (result.outcome === 'armed') void navigate({ to: '/downloads' })
  }

  if (!file) {
    return (
      <section className="hb-screen" data-observed={cache != null}>
        <h1>{COPY.shell.modelDetail}</h1>
        <p role="status">{COPY.f2.s3NoResults}</p>
      </section>
    )
  }

  return (
    <section className="hb-screen" data-model={modelId} data-observed={cache != null}>
      <h1>{file.name}</h1>
      <p className="hb-quiet">{COPY.f3.purposeLabel}</p>
      <p>{COPY.f3.purposeDefault}</p>
      <p className="hb-quiet">{COPY.f3.notFor}</p>

      {/* verdict-before-CTA */}
      <FitLine fit={fit} />
      {fit?.verdict === 'unknown' && <p role="status">{COPY.f3.s6Ack}</p>}
      {fit?.verdict === 'no-fit' && <p role="status">{COPY.f3.s2Rescue}</p>}

      <button type="button" onClick={() => void download()} disabled={fit?.verdict === 'no-fit'}>
        {COPY.f3.downloadCta(formatSize(file.bytes))}
      </button>
      {outcome?.outcome === 'blocked-space' && <p role="alert">{COPY.f4.s8}</p>}

      <p className="hb-quiet">{COPY.f3.reassurance}</p>
      <p>{COPY.f3.promise}</p>
      <details>
        <summary>{COPY.f3.fingerprintExperts}</summary>
        <p>{COPY.f3.verificationExplainer}</p>
      </details>
    </section>
  )
}
