// The F11 fit module (§5.8): the single fit-object constructor + the one download
// entry point. Consumed by F2/F3/F8; never a second fit opinion elsewhere.
export { computeFit } from './fitObject'
export type { FitInput, FitReason } from './fitObject'
export { armDownload } from './armDownload'
export type { ArmOutcome, ArmRequest, ArmContext } from './armDownload'
export { useFitObject, useMachineKnown } from './useFit'
export { toGB, formatSize, requiredBytes, usableMemory, isAppleSilicon, probeUsable, APPLE_SILICON_UNIFIED_CEILING } from './compat'
