import type { HardwareInfo } from '../ipc'

// Memory arithmetic for the fit object. Ported from Jan's modelCompatibility.ts
// (KEEP+EXTEND per ENGINEERING_SPEC §5.8) and kept PURE + deterministic: no IPC,
// no clock, no randomness. The inherited hardware payload reports memory in MiB
// (schemas.ts / Rust commands.rs); every byte value below is derived from that.

export const MIB = 1024 * 1024
export const GB = 1_000_000_000 // decimal GB — the unit the FIT copy renders

// Jan's tuned constants (modelCompatibility.ts). Not re-tuned here; the fit
// object's job is to consume the same math the traffic-light hook already uses.
const KV_HEURISTIC_RATIO = 0.1
const KV_BASELINE_CTX = 4096
export const DEFAULT_CTX_LENGTH = 8192
const DISCRETE_RESERVE_BYTES = 2_288_490_189
const APPLE_SILICON_FIXED_OVERHEAD = 2_684_354_560
const APPLE_SILICON_VARIABLE_RATIO = 0.1
// Apple-Silicon unified-memory ceiling ≈ 75% of RAM (§5.8): the UI must never
// treat a 64 GB Mac as 64 GB of usable working set. Jan's 0.85 comfort ratio is
// applied ON TOP of the ceiling, so the effective green band stays conservative.
export const APPLE_SILICON_UNIFIED_CEILING = 0.75
const APPLE_SILICON_COMFORTABLE_RATIO = 0.85

export function totalRamBytes(hardware: HardwareInfo): number {
  return (hardware.total_memory || 0) * MIB
}
export function totalVramBytes(hardware: HardwareInfo): number {
  return hardware.gpus.reduce((sum, g) => sum + (g.total_memory || 0) * MIB, 0)
}

// Apple Silicon reports unified memory and no discrete GPU in Jan's probe model.
export function isAppleSilicon(hardware: HardwareInfo): boolean {
  return (
    hardware.os_type === 'macos' &&
    hardware.cpu.arch === 'aarch64' &&
    hardware.gpus.length === 0
  )
}

export function estimateKvCacheBytes(fileSizeBytes: number, ctxLength = DEFAULT_CTX_LENGTH): number {
  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) return 0
  const ctx = ctxLength > 0 ? ctxLength : DEFAULT_CTX_LENGTH
  return fileSizeBytes * KV_HEURISTIC_RATIO * (ctx / KV_BASELINE_CTX)
}

// B3 probe-sanity floor (§5.8, P0-S20): zeros / absent fields are a FAILED probe,
// never a tiny machine. Returns false → the fit object must render machine-unknown.
export function probeUsable(hardware: HardwareInfo | null | undefined): hardware is HardwareInfo {
  return !!hardware && totalRamBytes(hardware) > 0
}

export interface UsableMemory {
  usableBytes: number
  // The comfort band below which a fit is 'fits' rather than 'tight'.
  comfortableBytes: number
}

// Usable working set for the machine, honouring the Apple-Silicon unified ceiling
// and the discrete-GPU reserves exactly as Jan's estimateModelFit does.
export function usableMemory(hardware: HardwareInfo): UsableMemory {
  if (isAppleSilicon(hardware)) {
    const total = totalRamBytes(hardware)
    const ceiling = total * APPLE_SILICON_UNIFIED_CEILING
    const variableOverhead = total * APPLE_SILICON_VARIABLE_RATIO
    const afterOverhead = Math.max(0, total - APPLE_SILICON_FIXED_OVERHEAD - variableOverhead)
    const usableBytes = Math.min(ceiling, afterOverhead)
    return { usableBytes, comfortableBytes: usableBytes * APPLE_SILICON_COMFORTABLE_RATIO }
  }
  const ram = totalRamBytes(hardware)
  const vram = totalVramBytes(hardware)
  if (vram <= 0) {
    const usableBytes = Math.max(0, ram - DISCRETE_RESERVE_BYTES)
    // No discrete GPU: Jan has no yellow band here — fits or it doesn't.
    return { usableBytes, comfortableBytes: usableBytes }
  }
  const usableVram = Math.max(0, vram - DISCRETE_RESERVE_BYTES)
  const usableRam = Math.max(0, ram - DISCRETE_RESERVE_BYTES)
  // green iff it fits in VRAM alone; yellow iff it fits with RAM spillover.
  return { usableBytes: usableRam + usableVram, comfortableBytes: usableVram }
}

// Required working set for a file of the given on-disk size (weights + KV cache).
export function requiredBytes(fileSizeBytes: number, ctxLength = DEFAULT_CTX_LENGTH): number {
  return fileSizeBytes + estimateKvCacheBytes(fileSizeBytes, ctxLength)
}

export const toGB = (bytes: number): number => Math.round((bytes / GB) * 10) / 10

// Human file size for the download CTA / orientation lines. Pure; lives here so
// feature files never build display strings inline (verbatim-copy law). Uses
// decimal units to match the FIT "GB" register.
export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—'
  if (bytes >= GB) return `${toGB(bytes)} GB`
  const mb = Math.round(bytes / 1_000_000)
  return `${mb} MB`
}
