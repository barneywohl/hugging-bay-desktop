import { afterEach, describe, expect, it, vi } from 'vitest'
import { createClient, type Transport } from '../ipc/client'
import { connectMirrors } from '../stores/synchronize'
import { downloadMirror, selectDownloadState } from '../stores/download'
import { verifyMirror, selectChecked } from '../stores/verify'
import { engineMirror, selectRunningModel, selectLoadedModel } from '../stores/engine'
import { fitMirror } from '../stores/fit'
import { libraryMirror } from '../stores/library'
import { settingsMirror } from '../stores/settings'
import type { CommandName, EventName } from '../ipc/contracts'

function harness(implemented: CommandName[] = []) {
  const handlers = new Map<string, (payload: unknown) => void>()
  const releases: ReturnType<typeof vi.fn>[] = []
  const wire: Transport = {
    available: () => true,
    invoke: vi.fn(async () => null),
    listen: vi.fn(async (name, handler) => {
      handlers.set(name, handler)
      const release = vi.fn(() => { handlers.delete(name) })
      releases.push(release)
      return release
    }),
  }
  const client = createClient(wire, new Set(implemented))
  return { client, wire, handlers, releases, emit: (name: EventName, payload: unknown) => handlers.get(name)?.(payload) }
}
const sessions: ReturnType<typeof connectMirrors>[] = []
const start = (client: ReturnType<typeof createClient>) => { const session = connectMirrors(client); sessions.push(session); return session }
afterEach(() => { sessions.splice(0).forEach((session) => session.stop()) })

describe('core mirror laws', () => {
  it('starts unknown, never renders an empty library or a running/verified model by default', async () => {
    const h = harness()
    const session = start(h.client)
    await session.ready
    expect(downloadMirror.getSnapshot().value).toBeNull()
    expect(verifyMirror.getSnapshot().value).toBeNull()
    expect(libraryMirror.getSnapshot().value).toBeNull()
    expect(settingsMirror.getSnapshot().value).toBeNull()
    expect(fitMirror.getSnapshot().value).toBeNull()
    expect(selectRunningModel(engineMirror.getSnapshot().value)).toBeNull()
  })
  it('mirrors download/state only; completion and percentages cannot mark a file checked', async () => {
    const h = harness(); await start(h.client).ready
    h.emit('download/requested', { taskId: 't', modelId: 'm', fileId: 'f', source: 'detail' })
    h.emit('download/progress', { taskId: 't', bytesReceived: 100, totalBytes: 100, speedBps: 1 })
    h.emit('download/completed', { taskId: 't', modelId: 'm', fileId: 'f' })
    expect(selectDownloadState(downloadMirror.getSnapshot().value?.t)).toBeNull()
    expect(selectChecked(verifyMirror.getSnapshot().value?.f)).toBe(false)
    h.emit('download/state', { taskId: 't', from: 'S16', to: 'S17' })
    expect(selectDownloadState(downloadMirror.getSnapshot().value?.t)).toBe('S17')
    expect(selectChecked(verifyMirror.getSnapshot().value?.f)).toBe(false)
    h.emit('check/result', { fileId: 'f', verdict: 'matched', fingerprintChecked: 'hash' })
    expect(selectChecked(verifyMirror.getSnapshot().value?.f)).toBe(true)
    h.emit('download/state', { taskId: 't', from: 'S16', to: 'S17' })
    expect(selectChecked(verifyMirror.getSnapshot().value?.f)).toBe(true)
    h.emit('check/progress', { fileId: 'f', bytesHashed: 1, bytesTotal: 100 })
    expect(selectChecked(verifyMirror.getSnapshot().value?.f)).toBe(false)
  })
  it('ready is live but not running; first token flips running; death clears it', async () => {
    const h = harness(); await start(h.client).ready
    // engine/ready = loaded + live (IND dot), but NOT the "running" claim.
    h.emit('engine/ready', { modelId: 'm' })
    expect(selectLoadedModel(engineMirror.getSnapshot().value)).toEqual({ modelId: 'm', fileId: null })
    expect(selectRunningModel(engineMirror.getSnapshot().value)).toBeNull()
    // Only a real first token makes it running.
    h.emit('engine/first-token', { modelId: 'm' })
    expect(selectRunningModel(engineMirror.getSnapshot().value)).toEqual({ modelId: 'm', fileId: null })
    // External death clears both the running claim and the liveness dot.
    h.emit('engine/crashed', { modelId: 'm', kind: 'killed-externally' })
    expect(selectRunningModel(engineMirror.getSnapshot().value)).toBeNull()
    expect(selectLoadedModel(engineMirror.getSnapshot().value)).toBeNull()
    h.emit('engine/ready', { modelId: 'm' })
    h.emit('engine/ready', {})
    expect(selectRunningModel(engineMirror.getSnapshot().value)).toBeNull()
  })
  it('does not let a delayed get_loaded response resurrect a killed session', async () => {
    const h = harness(['engine.get_loaded'])
    let resolveLoaded: ((value: unknown) => void) | undefined
    h.wire.invoke = vi.fn((command) => command === 'engine.get_loaded' ? new Promise((resolve) => { resolveLoaded = resolve }) : Promise.resolve(null))
    const session = start(h.client)
    await vi.waitFor(() => expect(resolveLoaded).toBeDefined())
    h.emit('engine/crashed', { modelId: 'm', kind: 'killed-externally' })
    resolveLoaded?.({ ok: true, value: { modelId: 'm', fileId: 'f' } })
    await session.ready
    expect(selectRunningModel(engineMirror.getSnapshot().value)).toBeNull()
  })
  it('clears the library on a root watcher event; late list responses cannot restore stale rows', async () => {
    const h = harness(['library.list'])
    let resolveList: ((value: unknown) => void) | undefined
    h.wire.invoke = vi.fn((command) => command === 'library.list' ? new Promise((resolve) => { resolveList = resolve }) : Promise.resolve(null))
    const session = start(h.client)
    await vi.waitFor(() => expect(resolveList).toBeDefined())
    h.emit('library/storage-unreachable', { path: '/external/models', reason: 'unplugged' })
    resolveList?.({ ok: true, value: [{ modelId: 'm', fileId: 'f', size: 1, checkVerdict: 'matched', lastOpenedAt: null }] })
    await session.ready
    expect(libraryMirror.getSnapshot().value).toBeNull()
    expect(verifyMirror.getSnapshot().value).toBeNull()
  })
  it('has no event leaks when disposed before async listen registration finishes', async () => {
    const h = harness()
    const deferred: (() => void)[] = []
    h.wire.listen = vi.fn((_name, _handler) => new Promise((resolve) => {
      const release = vi.fn(); h.releases.push(release)
      deferred.push(() => resolve(release))
    }))
    const session = start(h.client)
    session.stop()
    deferred.forEach((resolve) => resolve())
    await session.ready
    expect(h.releases.length).toBeGreaterThan(20)
    h.releases.forEach((release) => expect(release).toHaveBeenCalledOnce())
    expect(h.wire.invoke).not.toHaveBeenCalled()
  })
  it('removes listeners and forgets verdicts on unmount/relaunch', async () => {
    const h = harness(); const session = start(h.client); await session.ready
    h.emit('check/result', { fileId: 'f', verdict: 'matched', fingerprintChecked: 'hash' })
    session.stop(); session.stop()
    expect(h.handlers.size).toBe(0)
    h.releases.forEach((release) => expect(release).toHaveBeenCalledOnce())
    expect(verifyMirror.getSnapshot().value).toBeNull()
  })
  it('does not request an update, catalog, model, notification or telemetry on boot', async () => {
    const h = harness(); await start(h.client).ready
    expect(vi.mocked(h.wire.invoke).mock.calls.map(([command]) => command)).toEqual(['settings_get'])
  })
})
