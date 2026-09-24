import { FIT } from '../../copy/strings'
import type { FitObject } from '../../ipc'

// F11 owns the fit line; F2/F3/F8 import it verbatim (§0.6 law 1). This renders
// the ONE fit object — it never computes fit itself. Strings come from FIT only.
export function FitLine({ fit }: { fit: FitObject | null }) {
  if (!fit || fit.verdict === 'unknown' || fit.needGB == null || fit.haveGB == null) {
    return <p className="hb-fit" data-verdict="unknown">{FIT.unknown}</p>
  }
  if (fit.verdict === 'no-fit') {
    return <p className="hb-fit" data-verdict="no-fit">{FIT.tooBig(fit.needGB, fit.haveGB)}</p>
  }
  // 'fits' and 'tight' both run on this Mac — the FIT register has one "runs" line.
  return <p className="hb-fit" data-verdict={fit.verdict}>{FIT.runs(fit.needGB, fit.haveGB)}</p>
}

// Retained default surface so the discover/model-detail composition keeps a fit
// region even before a file is selected.
export function FitScreen({ fit = null }: { fit?: FitObject | null }) {
  return <FitLine fit={fit} />
}
