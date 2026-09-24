import { z } from 'zod'
import * as s from './schemas'

function contract<A extends z.ZodType, R extends z.ZodType>(area: s.HbArea, args: A, result: R) {
  return { area, args, result }
}
const voidResult = s.empty
const textForThread = s.threadRef.extend({ text: z.string() })
const modelUpdate = s.modelRef.extend({ oldFingerprint: s.id, newFingerprint: s.id })

// Literal wire names from ENGINEERING_SPEC §2.2. None of these HB commands is
// registered by the inherited Rust fork yet. See client.ts for the live adapters.
export const commands = {
  'downloads.start': contract('DOWNLOAD', z.object({ task: s.taskReceipt }).strict(), s.taskRef),
  'downloads.pause': contract('DOWNLOAD', s.taskRef, voidResult),
  'downloads.resume': contract('DOWNLOAD', s.taskRef, voidResult),
  'downloads.cancel': contract('DOWNLOAD', s.taskRef, voidResult),
  'downloads.retry': contract('DOWNLOAD', s.taskRef, voidResult),
  'downloads.arm': contract('DOWNLOAD', s.armArgs, s.taskRef),
  'verify.start': contract('CHECK', s.fileRef, z.object({ checkId: s.id })),
  'verify.recheck': contract('CHECK', s.fileRef, z.object({ checkId: s.id })),
  'verify.status': contract('CHECK', s.fileRef, z.object({ verdict: s.checkVerdict.nullable(), checkedAt: z.string().nullable() })),
  'machine.probe': contract('FIT', s.empty, s.machineProfile),
  'machine.profile': contract('FIT', s.empty, s.cachedProfile.nullable()),
  'storage.free_space': contract('STORAGE', s.empty, z.object({ bytes: s.bytes, path: s.id })),
  'connectivity/state': contract('CONNECT', s.empty, s.connectivity),
  'engine.load': contract('ENGINE', s.modelFile, z.object({ session: s.id })),
  'engine.unload': contract('ENGINE', s.modelRef, voidResult),
  'engine.get_loaded': contract('ENGINE', s.empty, s.modelFile.nullable()),
  'engine.infer': contract('ENGINE', s.modelRef.extend({ messages: z.array(s.message), context: z.object({ threadId: s.id }) }), z.object({ text: z.string() })),
  'threads.create': contract('THREAD', z.object({ title: z.string() }).strict(), s.thread),
  'threads.get': contract('THREAD', s.threadRef, s.thread.nullable()),
  'threads.list': contract('THREAD', s.empty, z.array(s.thread)),
  'threads.rename': contract('THREAD', s.threadRef.extend({ title: z.string() }), voidResult),
  'threads.delete': contract('THREAD', s.threadRef, voidResult),
  'threads.draft_save': contract('THREAD', textForThread, voidResult),
  'threads.draft_load': contract('THREAD', s.threadRef, z.object({ text: z.string() }).nullable()),
  'threads.flush_partial': contract('THREAD', textForThread, voidResult),
  'threads.undo_delete': contract('THREAD', s.threadRef, voidResult),
  'library.list': contract('STORAGE', s.empty, z.array(s.libraryRecord)),
  'library.delete': contract('STORAGE', s.modelRef, voidResult),
  'library.restore': contract('STORAGE', s.modelRef, voidResult),
  'library.purge': contract('STORAGE', s.modelRef, voidResult),
  'library.details': contract('STORAGE', s.modelRef, s.libraryDetails),
  'storage.resolve': contract('STORAGE', s.empty, s.storageRoot),
  'storage.set_root': contract('STORAGE', z.object({ path: s.id }).strict(), voidResult),
  'storage.measure': contract('STORAGE', s.modelRef, z.object({ bytes: s.bytes })),
  'update/app-check': contract('UPDATE', z.object({ trigger: z.enum(['auto', 'manual']) }).strict(), z.union([z.object({ version: s.id }), z.object({ upToDate: z.literal(true) })])),
  'update/app-download': contract('UPDATE', s.empty, voidResult),
  'update/app-install': contract('UPDATE', s.empty, voidResult),
  'update.snooze': contract('UPDATE', z.object({ version: s.id, days: z.number().int().positive() }).strict(), voidResult),
  'update/model-check': contract('UPDATE', s.empty, z.object({ updates: z.array(modelUpdate) })),
  'update/app-status': contract('UPDATE', s.empty, s.appUpdateState),
  'catalog.read_cache': contract('CATALOG', s.empty, s.catalogCache),
  'catalog.refresh': contract('CATALOG', s.empty, s.catalogCache),
  'diagnostics.export': contract('DIAG', s.empty, z.object({ path: s.id })),
  'diagnostics.egress_read': contract('DIAG', z.object({ since: s.id }).strict(), z.array(s.egressEntry)),
  'diagnostics.proof_gates': contract('DIAG', s.empty, z.object({ gates: z.array(s.proofGate) })),
  'notify.permission_state': contract('NOTIFY', s.empty, s.permission),
  'notify.request': contract('NOTIFY', s.empty, z.enum(['granted', 'denied'])),
  'notify.send': contract('NOTIFY', z.object({ id: s.id, title: z.string(), body: z.string() }).strict(), voidResult),
  'notify.mark_ready': contract('NOTIFY', s.empty, voidResult),
  'shortlist.encode': contract('SHORTLIST', z.object({ modelIds: z.array(s.id) }).strict(), z.object({ link: s.id })),
  'shortlist.decode': contract('SHORTLIST', z.object({ link: s.id }).strict(), z.object({ modelIds: z.array(s.id) })),
} as const
export type CommandName = keyof typeof commands
export type CommandArgs<K extends CommandName> = z.infer<(typeof commands)[K]['args']>
export type CommandValue<K extends CommandName> = z.infer<(typeof commands)[K]['result']>

const engineModel = s.modelRef
export const events = {
  'download/requested': s.armArgs.extend({ taskId: s.id }),
  'download/progress': s.taskRef.extend({ bytesReceived: s.bytes, totalBytes: s.bytes, speedBps: z.number().nonnegative() }),
  'download/state': s.taskRef.extend({ from: s.downloadState, to: s.downloadState, reason: z.string().optional() }),
  'download/slow': s.taskRef.extend({ reason: z.literal('slow') }),
  'download/stall': s.taskRef.extend({ reason: z.literal('stall') }),
  'download/lost': s.taskRef.extend({ reason: z.literal('offline') }),
  'download/space': s.taskRef.extend({ reason: z.literal('space') }),
  'download/metered': s.taskRef.extend({ reason: z.literal('metered') }),
  'download/retried': s.taskRef.extend({ attempt: s.bytes }),
  'download/completed': s.taskRef.extend({ modelId: s.id, fileId: s.id }),
  'download/failed': s.taskRef.extend({ error: s.hbError }),
  'download/resumed': s.taskRef.extend({ fromState: s.downloadState }),
  'download/checkpoint': s.taskRef.extend({ bytesReceived: s.bytes }),
  'download/etawatch': s.taskRef.extend({ verdict: z.enum(['earned', 'withdrawn']) }),
  'download/completed_notify_ready': s.taskRef,
  'check/progress': s.fileRef.extend({ bytesHashed: s.bytes, bytesTotal: s.bytes }),
  'check/result': s.checkResult,
  'machine/probe-completed': z.object({ profile: s.machineProfile, fingerprint: s.id }),
  'machine/profile-ready': z.object({ profile: s.machineProfile }),
  'library/storage-moved': z.object({ path: s.id }),
  'library/storage-unreachable': z.object({ path: s.id, reason: z.string() }),
  'engine/starting': engineModel,
  'engine/progress': engineModel.extend({ stage: s.id, message: z.string().optional() }),
  'engine/ready': engineModel,
  'engine/first-token': engineModel,
  'engine/pressure': z.object({ level: z.enum(['high', 'normal']) }),
  'engine/oom': engineModel.extend({ oomKind: z.enum(['load', 'chat']), biggestThatFits: s.modelFile }),
  'engine/crashed': engineModel.extend({ kind: z.enum(['generic', 'killed-externally']) }),
  'engine/unloaded': engineModel,
  'engine/offload': engineModel.extend({ from: z.enum(['gpu', 'metal']), to: z.literal('cpu') }),
  'update/app-available': z.object({ version: s.id, notes: z.string().optional() }),
  'update/app-downloaded': z.object({ version: s.id }),
  'update/app-installed': z.object({ version: s.id }),
  'update/app-failed': z.object({ version: s.id, error: s.hbError }),
  'update/model-available': modelUpdate,
  'update/model-checked': s.modelRef.extend({ verdict: s.checkVerdict }),
  'update/model-failed': s.modelRef.extend({ error: s.hbError }),
  'notify/will-show': z.object({ id: s.id }),
  'connectivity/online': z.object({ online: z.boolean() }),
  'connectivity/metered': z.object({ metered: z.boolean() }),
} as const
export type EventName = keyof typeof events
export type EventPayload<K extends EventName> = z.infer<(typeof events)[K]>

// Deliberately NOT keys of events or commands. No internal action can reach the
// Tauri listener. The four internal engine rows in §2.4.5 have no public listener.
export type InternalAction =
  | { type: 'engine.quant_fallback'; payload: z.infer<typeof s.modelFile> }
  | { type: 'engine.stalled'; payload: { modelId: string; waitedMs?: number } }
  | { type: 'engine.stopped'; payload: { modelId: string; keptChars: number } }
  | { type: 'engine.starting-gpu-test'; payload: Record<string, never> }
  | { type: 'engine.gpu-test-passed'; payload: Record<string, never> }
  | { type: 'chat.requested'; payload: { modelId: string } }
  | { type: 'fit.quant_fallback_offered'; payload: { modelId: string; biggerFileId: string; smallerFileId: string } }
// §2.4.9's timers.audit contains a dot, illegal in a Tauri event name. Preserve
// its exact contract for the audit harness; do not silently invent a wire alias.
export type TimerAudit = { id: string; owner: string; verdict: string }
