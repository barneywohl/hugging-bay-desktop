import { invoke, isTauri } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { z } from 'zod'
import { commands, events, type CommandArgs, type CommandName, type CommandValue, type EventName, type EventPayload } from './contracts'
import * as s from './schemas'

export type Unsubscribe = () => void
export interface Transport {
  available(): boolean
  invoke(command: string, args: Record<string, unknown>): Promise<unknown>
  listen(event: string, handler: (payload: unknown) => void): Promise<Unsubscribe>
}
const tauriTransport: Transport = {
  available: isTauri,
  invoke: (command, args) => invoke<unknown>(command, args),
  listen: (event, handler) => listen<unknown>(event, ({ payload }) => handler(payload)),
}
export function failure(area: s.HbArea, kind: s.HbError['kind']): { ok: false; error: s.HbError } {
  const suffix = { unavailable: 'UNAVAILABLE', 'invalid-payload': 'INVALID_PAYLOAD', transport: 'TRANSPORT', core: 'CORE', 'write-not-applied': 'WRITE_NOT_APPLIED' }[kind]
  return { ok: false, error: { code: `HB-${area}-${suffix}`, kind } }
}

// Only add an HB wire name here with Rust registration + contract evidence.
// Do not route engine.load to Jan's load_model: that bypasses the fileId check gate.
export const implementedCommands: ReadonlySet<CommandName> = new Set()

export function createClient(transport: Transport = tauriTransport, implemented = implementedCommands) {
  async function call<K extends CommandName>(command: K, args: CommandArgs<K>): Promise<s.HbResult<CommandValue<K>>> {
    const definition = commands[command]
    const parsedArgs = definition.args.safeParse(args)
    if (!parsedArgs.success) return failure(definition.area, 'invalid-payload')
    if (!transport.available() || !implemented.has(command)) return failure(definition.area, 'unavailable')
    try {
      const raw = await transport.invoke(command, parsedArgs.data)
      const parsed = s.resultSchema(definition.result).safeParse(raw)
      // This assertion preserves the registry's key/result relationship, lost by
      // TS when indexing a union of Zod schemas. The runtime parse is mandatory.
      return parsed.success ? parsed.data as s.HbResult<CommandValue<K>> : failure(definition.area, 'invalid-payload')
    } catch {
      return failure(definition.area, 'transport')
    }
  }
  async function on<K extends EventName>(event: K, handler: (payload: EventPayload<K>) => void,
    onError: (error: s.HbError) => void): Promise<s.HbResult<Unsubscribe>> {
    if (!transport.available()) return failure('DIAG', 'unavailable')
    try {
      const unsubscribe = await transport.listen(event, (payload) => {
        const parsed = events[event].safeParse(payload)
        if (parsed.success) handler(parsed.data as EventPayload<K>)
        else onError(failure('DIAG', 'invalid-payload').error)
      })
      return { ok: true, value: unsubscribe }
    } catch {
      return failure('DIAG', 'transport')
    }
  }
  async function native<T extends z.ZodType>(command: string, args: Record<string, unknown>, schema: T,
    area: s.HbArea): Promise<s.HbResult<z.infer<T>>> {
    if (!transport.available()) return failure(area, 'unavailable')
    try {
      const raw = await transport.invoke(command, args)
      const parsed = schema.safeParse(raw)
      return parsed.success ? { ok: true, value: parsed.data } : failure(area, 'invalid-payload')
    } catch {
      return failure(area, 'transport')
    }
  }
  const hardware = {
    getSystemInfo: () => native('plugin:hardware|get_system_info', {}, s.hardwareInfo, 'FIT'),
    getSystemUsage: () => native('plugin:hardware|get_system_usage', {}, s.hardwareUsage, 'FIT'),
    refreshSystemInfo: () => native('plugin:hardware|refresh_system_info', {}, z.null(), 'FIT'),
  }
  const settingsKey = 'hb.settings.v1'
  async function readSettings(): Promise<s.HbResult<s.Settings | null>> {
    const raw = await native('settings_get', { key: settingsKey }, z.string().nullable(), 'STORAGE')
    if (!raw.ok) return raw
    if (raw.value === null) return { ok: true, value: null }
    try {
      const parsed = s.settings.safeParse(JSON.parse(raw.value))
      return parsed.success ? { ok: true, value: parsed.data } : failure('STORAGE', 'invalid-payload')
    } catch {
      return failure('STORAGE', 'invalid-payload')
    }
  }
  // Serialize write/read-back pairs so a second UI write cannot masquerade as
  // the first one's acknowledgement. Core currently acknowledges its memory
  // map; disk flush durability remains the inherited Rust store's responsibility.
  let writes = Promise.resolve()
  function writeSettings(value: s.Settings): Promise<s.HbResult<s.Settings>> {
    const operation = writes.then(async (): Promise<s.HbResult<s.Settings>> => {
      const parsed = s.settings.safeParse(value)
      if (!parsed.success) return failure('STORAGE', 'invalid-payload')
      const written = await native('settings_set', { key: settingsKey, value: JSON.stringify(parsed.data) }, z.null(), 'STORAGE')
      if (!written.ok) return written
      const readBack = await readSettings()
      if (!readBack.ok) return readBack
      if (readBack.value === null || JSON.stringify(readBack.value) !== JSON.stringify(parsed.data)) {
        return failure('STORAGE', 'write-not-applied')
      }
      return { ok: true, value: readBack.value }
    })
    writes = operation.then(() => undefined, () => undefined)
    return operation
  }
  return {
    call, on, hardware,
    settings: { read: readSettings, write: writeSettings },
    downloads: {
      start: (args: CommandArgs<'downloads.start'>) => call('downloads.start', args),
      pause: (args: CommandArgs<'downloads.pause'>) => call('downloads.pause', args),
      resume: (args: CommandArgs<'downloads.resume'>) => call('downloads.resume', args),
      cancel: (args: CommandArgs<'downloads.cancel'>) => call('downloads.cancel', args),
      retry: (args: CommandArgs<'downloads.retry'>) => call('downloads.retry', args),
      arm: (args: CommandArgs<'downloads.arm'>) => call('downloads.arm', args),
    },
    verify: {
      start: (args: CommandArgs<'verify.start'>) => call('verify.start', args),
      recheck: (args: CommandArgs<'verify.recheck'>) => call('verify.recheck', args),
      status: (args: CommandArgs<'verify.status'>) => call('verify.status', args),
    },
    machine: {
      probe: () => call('machine.probe', {}),
      profile: () => call('machine.profile', {}),
    },
    storage: {
      freeSpace: () => call('storage.free_space', {}),
      resolve: () => call('storage.resolve', {}),
      setRoot: (args: CommandArgs<'storage.set_root'>) => call('storage.set_root', args),
      measure: (args: CommandArgs<'storage.measure'>) => call('storage.measure', args),
    },
    connectivity: {
      state: () => call('connectivity/state', {}),
    },
    engine: {
      load: (args: CommandArgs<'engine.load'>) => call('engine.load', args),
      unload: (args: CommandArgs<'engine.unload'>) => call('engine.unload', args),
      getLoaded: () => call('engine.get_loaded', {}),
      infer: (args: CommandArgs<'engine.infer'>) => call('engine.infer', args),
    },
    threads: {
      create: (args: CommandArgs<'threads.create'>) => call('threads.create', args),
      get: (args: CommandArgs<'threads.get'>) => call('threads.get', args),
      list: () => call('threads.list', {}),
      rename: (args: CommandArgs<'threads.rename'>) => call('threads.rename', args),
      delete: (args: CommandArgs<'threads.delete'>) => call('threads.delete', args),
      draftSave: (args: CommandArgs<'threads.draft_save'>) => call('threads.draft_save', args),
      draftLoad: (args: CommandArgs<'threads.draft_load'>) => call('threads.draft_load', args),
      flushPartial: (args: CommandArgs<'threads.flush_partial'>) => call('threads.flush_partial', args),
      undoDelete: (args: CommandArgs<'threads.undo_delete'>) => call('threads.undo_delete', args),
    },
    library: {
      list: () => call('library.list', {}),
      delete: (args: CommandArgs<'library.delete'>) => call('library.delete', args),
      restore: (args: CommandArgs<'library.restore'>) => call('library.restore', args),
      purge: (args: CommandArgs<'library.purge'>) => call('library.purge', args),
      details: (args: CommandArgs<'library.details'>) => call('library.details', args),
    },
    updates: {
      appCheck: (args: CommandArgs<'update/app-check'>) => call('update/app-check', args),
      appDownload: () => call('update/app-download', {}),
      appInstall: () => call('update/app-install', {}),
      snooze: (args: CommandArgs<'update.snooze'>) => call('update.snooze', args),
      modelCheck: () => call('update/model-check', {}),
      appStatus: () => call('update/app-status', {}),
    },
    catalog: {
      readCache: () => call('catalog.read_cache', {}),
      refresh: () => call('catalog.refresh', {}),
    },
    diagnostics: {
      export: () => call('diagnostics.export', {}),
      egressRead: (args: CommandArgs<'diagnostics.egress_read'>) => call('diagnostics.egress_read', args),
      proofGates: () => call('diagnostics.proof_gates', {}),
    },
    notify: {
      permissionState: () => call('notify.permission_state', {}),
      request: () => call('notify.request', {}),
      send: (args: CommandArgs<'notify.send'>) => call('notify.send', args),
      markReady: () => call('notify.mark_ready', {}),
    },
    shortlist: {
      encode: (args: CommandArgs<'shortlist.encode'>) => call('shortlist.encode', args),
      decode: (args: CommandArgs<'shortlist.decode'>) => call('shortlist.decode', args),
    },
  }
}
export type HbClient = ReturnType<typeof createClient>
export const ipc = createClient()
