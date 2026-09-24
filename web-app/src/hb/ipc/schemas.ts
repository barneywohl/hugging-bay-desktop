import { z } from 'zod'

// JSON numbers cannot represent the whole Rust u64 range. Reject unsafe values
// rather than silently rounding a byte count. All HB byte fields are decimal bytes.
export const bytes = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
export const id = z.string().min(1)
export const empty = z.object({}).strict()
export const fileRef = z.object({ fileId: id }).strict()
export const modelRef = z.object({ modelId: id }).strict()
export const modelFile = modelRef.extend({ fileId: id })
export const taskRef = z.object({ taskId: id }).strict()
export const threadRef = z.object({ threadId: id }).strict()
export const area = z.enum(['DOWNLOAD', 'CHECK', 'ENGINE', 'THREAD', 'STORAGE',
  'UPDATE', 'CATALOG', 'CONNECT', 'NOTIFY', 'FIT', 'SHORTLIST', 'TIMER', 'DIAG', 'MIGRATE'])
export type HbArea = z.infer<typeof area>
export const hbError = z.object({
  code: z.string().regex(/^HB-(DOWNLOAD|CHECK|ENGINE|THREAD|STORAGE|UPDATE|CATALOG|CONNECT|NOTIFY|FIT|SHORTLIST|TIMER|DIAG|MIGRATE)-[A-Z0-9_]+$/),
  kind: z.enum(['unavailable', 'invalid-payload', 'transport', 'core', 'write-not-applied']),
  // Never rendered directly. No guessed causes or exception text is added here.
  cause: z.json().optional(),
})
export type HbError = z.infer<typeof hbError>
export type HbResult<T> = { ok: true; value: T } | { ok: false; error: HbError }
export const resultSchema = <T extends z.ZodType>(value: T) => z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), value }),
  z.object({ ok: z.literal(false), error: hbError }),
])

export const downloadState = z.enum(['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6',
  'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13', 'S14', 'S15', 'S16', 'S17',
  'S18', 'S19', 'C1A', 'C2E'])
export type DownloadState = z.infer<typeof downloadState>
// The spec leaves source open; preserve the caller's attribution, not a guessed enum.
// `expectedFingerprint` is the catalog's published SHA-256 for the file, carried
// through arm → task → verifier so a correct download reaches CHECKED (§4.3). It is
// optional: an arm from a source that published no fingerprint omits it, and the
// verifier then hashes for real but cannot claim a match (never a fabricated one).
export const armArgs = modelFile.extend({ source: id, expectedFingerprint: z.string().nullable().optional() })
export const taskReceipt = armArgs.extend({
  taskId: id, url: z.url(), bytesReceived: bytes, totalBytes: bytes.nullable(),
  etag: z.string().nullable(), lastModified: z.string().nullable(),
  partialPath: id, expectedFingerprint: z.string().nullable(),
})
export type TaskReceipt = z.infer<typeof taskReceipt>

export const checkVerdict = z.enum(['matched', 'mismatched', 'failed'])
// A matched result without a fingerprint is unrepresentable, including at runtime.
export const checkResult = z.discriminatedUnion('verdict', [
  fileRef.extend({ verdict: z.literal('matched'), fingerprintChecked: id }),
  fileRef.extend({ verdict: z.literal('mismatched'), fingerprintChecked: id.nullable() }),
  fileRef.extend({ verdict: z.literal('failed'), fingerprintChecked: id.nullable() }),
])
export type CheckResult = z.infer<typeof checkResult>

// Exact inherited hardware payload; memory units here are MiB (Rust commands.rs).
// Null vendor data is real; no invented CPU usage, Metal ceiling or fingerprint.
export const hardwareInfo = z.object({
  cpu: z.object({ name: z.string(), core_count: bytes, arch: z.string(), extensions: z.array(z.string()) }),
  os_type: z.string(), os_name: z.string(), total_memory: bytes,
  gpus: z.array(z.object({
    name: z.string(), total_memory: bytes, vendor: z.string(), uuid: z.string(), driver_version: z.string(),
    nvidia_info: z.object({ index: bytes, compute_capability: z.string() }).nullable(),
    vulkan_info: z.object({ index: bytes, device_id: bytes, device_type: z.string(), api_version: z.string() }).nullable(),
  })),
})
export type HardwareInfo = z.infer<typeof hardwareInfo>
export const hardwareUsage = z.object({
  cpu: z.number(), used_memory: bytes, total_memory: bytes,
  gpus: z.array(z.object({ uuid: z.string(), used_memory: bytes, total_memory: bytes })),
})
// HB profile extension contract. Not aliased to Jan's probe: fingerprint/cache and
// Metal working-set reporting still need a main-side owner in the next lane.
export const machineProfile = z.object({
  hardware: hardwareInfo, recommendedMaxWorkingSetSize: bytes.nullable(),
})
export type MachineProfile = z.infer<typeof machineProfile>
export const cachedProfile = z.object({ profile: machineProfile, fingerprint: id, probedAt: id })
export const fitObject = z.object({
  verdict: z.enum(['fits', 'tight', 'no-fit', 'unknown']), needGB: z.number().nonnegative().nullable(),
  haveGB: z.number().nonnegative().nullable(), quant: z.string(), reason: z.string(),
  rescue: modelFile.optional(),
})
export type FitObject = z.infer<typeof fitObject>

export const libraryRecord = modelFile.extend({
  size: bytes, checkVerdict: checkVerdict.nullable(), lastOpenedAt: z.string().nullable(),
})
export type LibraryRecord = z.infer<typeof libraryRecord>
export const libraryDetails = z.object({ path: id, bytes, fingerprint: z.string().nullable() })
export const storageRoot = z.object({ path: id, reachable: z.boolean() })
export const connectivity = z.object({ online: z.boolean(), metered: z.boolean() })
// §2.2 uses "respective" / "…" for threads, inference, catalog and updates.
// These minimal extension schemas are provisional until their owning lanes land.
export const message = z.object({ role: z.enum(['system', 'user', 'assistant']), content: z.string() })
export const thread = z.object({ threadId: id, title: z.string(), messages: z.array(message) })
// `expectedFingerprint` is the catalog's published SHA-256 for the file (nullable:
// a record without a published digest carries null). It is the reference the arm
// hands the verifier; a screen never renders it as a proof — only a byte-matched
// check/result does that.
export const catalogFile = modelFile.extend({ name: id, quant: id, bytes, needGB: z.number().nonnegative(), expectedFingerprint: z.string().nullable().optional() })
export type CatalogFile = z.infer<typeof catalogFile>
export const catalogCache = z.object({ records: z.array(catalogFile), fetchedAt: z.string().nullable() })
export const appUpdateState = z.object({
  state: z.enum(['idle', 'checking', 'available', 'downloading', 'staged', 'installing', 'failed', 'up-to-date']),
  version: z.string().nullable(),
  lastSuccessfulCheck: z.object({ at: id, bundleVersion: id }).nullable(),
})
export const egressKind = z.enum(['update_check', 'catalog_fetch', 'model_download', 'fingerprint_fetch'])
export const egressEntry = z.object({ at: id, kind: egressKind, host: id, bytes: bytes.optional() })
export const proofGate = z.object({ name: id, mode: id, status: z.enum(['passed', 'failed', 'not-run']) })
export const permission = z.enum(['granted', 'denied', 'undetermined'])

// Persisted under one HB-specific key in core/app/settings_store. No defaults
// are written on boot and null means main has no HB preferences yet.
export const settings = z.object({
  schemaVersion: z.literal(1),
  downloads: z.object({ allowMetered: z.boolean() }),
  updates: z.object({ automaticChecks: z.boolean() }),
  appearance: z.object({ theme: z.enum(['system', 'light', 'dark']) }),
  advanced: z.object({ enabled: z.boolean() }),
}).strict()
export type Settings = z.infer<typeof settings>
export type CatalogCache = z.infer<typeof catalogCache>
export type Connectivity = z.infer<typeof connectivity>
export type StorageRoot = z.infer<typeof storageRoot>
export type Thread = z.infer<typeof thread>
export type Message = z.infer<typeof message>
