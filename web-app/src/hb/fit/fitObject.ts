import type { CatalogFile, FitObject, HardwareInfo } from '../ipc'
import { DEFAULT_CTX_LENGTH, probeUsable, requiredBytes, toGB, usableMemory } from './compat'

// §0.6 law 1 + §5.8 F11 lock 1: ONE fit-object constructor. F2, F3 and F8 all
// consume this — they never carry a second fit opinion. Pure + deterministic.
//
// `reason` is a machine-readable tag (not rendered copy); screens map the verdict
// to the verbatim FIT strings. `needGB`/`haveGB` are earned numbers (§0.6 law 5):
// both are computed here from the measured file size and the probed memory.

export type FitReason =
  | 'machine-unknown' // B3 floor tripped or no profile — never a verdict (lock 4)
  | 'file-size-unknown' // the catalog record carries no usable byte count
  | 'fits-comfortably'
  | 'fits-tight'
  | 'too-big'

export interface FitInput {
  hardware: HardwareInfo | null | undefined
  file: Pick<CatalogFile, 'modelId' | 'fileId' | 'bytes' | 'quant' | 'needGB'>
  // The same model's other quant files, for the rescue (argmax-fits) search.
  siblings?: ReadonlyArray<Pick<CatalogFile, 'modelId' | 'fileId' | 'bytes' | 'quant' | 'needGB'>>
  ctxLength?: number
}

function needBytesOf(
  file: Pick<CatalogFile, 'bytes' | 'needGB'>,
  ctxLength: number
): number | null {
  if (file.bytes > 0) return requiredBytes(file.bytes, ctxLength)
  // Fall back to the published needGB estimate only when we have no real bytes.
  if (file.needGB > 0) return file.needGB * 1_000_000_000
  return null
}

// rescue = the BIGGEST sibling quant that still fits (argmax needGB ≤ haveGB,
// §5.8 P0-S22 / lock 2) — never the smallest available.
function findRescue(
  input: FitInput,
  usableBytes: number,
  thisNeed: number | null,
  ctxLength: number
): FitObject['rescue'] {
  const candidates = (input.siblings ?? [])
    .filter((s) => s.fileId !== input.file.fileId)
    .map((s) => ({ s, need: needBytesOf(s, ctxLength) }))
    .filter((c): c is { s: typeof c.s; need: number } => c.need != null && c.need <= usableBytes)
    // must be genuinely smaller than the file we could not run
    .filter((c) => thisNeed == null || c.need < thisNeed)
    .sort((a, b) => b.need - a.need)
  const best = candidates[0]
  return best ? { modelId: best.s.modelId, fileId: best.s.fileId } : undefined
}

export function computeFit(input: FitInput): FitObject {
  const ctxLength = input.ctxLength ?? DEFAULT_CTX_LENGTH
  const { file } = input

  // Machine-unknown never renders a verdict (F11 lock 4 / B3 floor).
  if (!probeUsable(input.hardware)) {
    return { verdict: 'unknown', needGB: null, haveGB: null, quant: file.quant, reason: 'machine-unknown' }
  }
  const { usableBytes, comfortableBytes } = usableMemory(input.hardware)
  const haveGB = toGB(usableBytes)

  const need = needBytesOf(file, ctxLength)
  if (need == null) {
    return { verdict: 'unknown', needGB: null, haveGB, quant: file.quant, reason: 'file-size-unknown' }
  }
  const needGB = toGB(need)

  if (need > usableBytes) {
    const rescue = findRescue(input, usableBytes, need, ctxLength)
    return { verdict: 'no-fit', needGB, haveGB, quant: file.quant, reason: 'too-big', rescue }
  }
  if (need <= comfortableBytes) {
    return { verdict: 'fits', needGB, haveGB, quant: file.quant, reason: 'fits-comfortably' }
  }
  // Fits, but above the comfort band — tight. A rescue may still be offered.
  const rescue = findRescue(input, usableBytes, need, ctxLength)
  return { verdict: 'tight', needGB, haveGB, quant: file.quant, reason: 'fits-tight', rescue }
}
