import { ipc, type EventName, type EventPayload, type HbClient, type HbError, type Settings, type Unsubscribe } from '../ipc'
import { failure } from '../ipc/client'
import { downloadMirror, receiveDownload } from './download'
import { verifyMirror, receiveCheckProgress, receiveCheckResult, invalidateCheck } from './verify'
import { engineMirror, receiveEngine } from './engine'
import { fitMirror } from './fit'
import { libraryMirror } from './library'
import { settingsMirror } from './settings'

const mirrors = [downloadMirror, verifyMirror, engineMirror, fitMirror, libraryMirror, settingsMirror]

/** A renderer-session lease. Cleanup is safe even while Tauri listen is pending.
 * Requests never invent domain states. Only parsed responses/events enter sinks.
 */
export function connectMirrors(client: HbClient = ipc) {
  let active = true
  let engineRevision = 0
  let libraryRevision = 0
  let settingsRevision = 0
  let hardwareRevision = 0
  const unlisteners: Unsubscribe[] = []
  const subscriptions: Promise<void>[] = []
  mirrors.forEach((mirror) => mirror.reset())

  function subscribe<K extends EventName>(name: K, handler: (payload: EventPayload<K>) => void,
    reject: (error: HbError) => void) {
    subscriptions.push(client.on(name, (payload) => { if (active) handler(payload) },
      (error) => { if (active) reject(error) }).then((result) => {
      if (result.ok) {
        if (active) unlisteners.push(result.value)
        else result.value()
      } else if (active) reject(result.error)
    }))
  }
  const downloadEvents = ['download/requested', 'download/progress', 'download/state',
    'download/slow', 'download/stall', 'download/lost', 'download/space', 'download/metered',
    'download/retried', 'download/completed', 'download/failed', 'download/resumed',
    'download/checkpoint', 'download/etawatch', 'download/completed_notify_ready'] as const
  for (const name of downloadEvents) {
    subscribe(name, (payload) => {
      receiveDownload(name, payload)
      if ('fileId' in payload) invalidateCheck(payload.fileId)
      if (name === 'download/state' && 'to' in payload && payload.to !== 'S17') {
        const fileId = downloadMirror.getSnapshot().value?.[payload.taskId]?.['download/requested']?.fileId
        if (fileId) invalidateCheck(fileId)
      }
    }, downloadMirror.reject)
  }
  subscribe('check/progress', receiveCheckProgress, verifyMirror.reject)
  subscribe('check/result', receiveCheckResult, verifyMirror.reject)
  subscribe('machine/probe-completed', ({ profile, fingerprint }) => {
    hardwareRevision++
    fitMirror.receive({ rawHardware: profile.hardware, profile, fingerprint })
  }, fitMirror.reject)
  subscribe('machine/profile-ready', ({ profile }) => {
    hardwareRevision++
    fitMirror.receive({ rawHardware: profile.hardware, profile, fingerprint: null })
  }, fitMirror.reject)

  const rejectEngine = (error: HbError) => { engineRevision++; engineMirror.reject(error) }
  subscribe('engine/starting', (starting) => {
    engineRevision++
    receiveEngine({ loaded: null, phase: 'starting', starting, oom: null, crashed: null, firstToken: null, progress: null, offload: null })
  }, rejectEngine)
  subscribe('engine/ready', ({ modelId }) => {
    engineRevision++
    receiveEngine({ loaded: { modelId, fileId: null }, phase: 'running', starting: null, oom: null, crashed: null, firstToken: null, progress: null })
  }, rejectEngine)
  subscribe('engine/unloaded', () => {
    engineRevision++
    receiveEngine({ loaded: null, phase: 'unloaded', starting: null, firstToken: null, progress: null, offload: null })
  }, rejectEngine)
  subscribe('engine/crashed', (crashed) => {
    engineRevision++
    receiveEngine({ loaded: null, phase: 'crashed', crashed, starting: null, firstToken: null, progress: null, offload: null })
  }, rejectEngine)
  subscribe('engine/oom', (oom) => {
    engineRevision++
    receiveEngine({ loaded: null, phase: 'oom', oom, starting: null, firstToken: null, progress: null, offload: null })
  }, rejectEngine)
  subscribe('engine/first-token', (firstToken) => {
    engineRevision++
    receiveEngine({ firstToken })
  }, rejectEngine)
  subscribe('engine/progress', (progress) => { engineRevision++; receiveEngine({ progress }) }, rejectEngine)
  subscribe('engine/pressure', (pressure) => { engineRevision++; receiveEngine({ pressure }) }, rejectEngine)
  subscribe('engine/offload', (offload) => { engineRevision++; receiveEngine({ offload }) }, rejectEngine)
  // First-token does not manufacture a loaded-session claim.
  for (const name of ['library/storage-moved', 'library/storage-unreachable'] as const) {
    subscribe(name, () => {
      libraryRevision++
      libraryMirror.reset()
      verifyMirror.reset()
    }, (error) => { libraryRevision++; libraryMirror.reject(error) })
  }

  async function refreshEngine() {
    const revision = ++engineRevision
    const result = await client.engine.getLoaded()
    if (active && revision === engineRevision) {
      if (result.ok) receiveEngine({ loaded: result.value, phase: result.value ? 'running' : 'unloaded' })
      else engineMirror.reject(result.error)
    }
    return result
  }
  async function refreshLibrary() {
    const revision = ++libraryRevision
    const result = await client.library.list()
    if (active && revision === libraryRevision) {
      if (result.ok) libraryMirror.receive(result.value)
      else libraryMirror.reject(result.error)
    }
    return result
  }
  async function readSettings() {
    const revision = ++settingsRevision
    const result = await client.settings.read()
    if (active && revision === settingsRevision) {
      if (result.ok) settingsMirror.receive(result.value)
      else settingsMirror.reject(result.error)
    }
    return result
  }
  async function writeSettings(value: Settings) {
    if (!active) return failure('STORAGE', 'unavailable')
    const revision = ++settingsRevision
    const result = await client.settings.write(value)
    if (active && revision === settingsRevision) {
      if (result.ok) settingsMirror.receive(result.value)
      else settingsMirror.reject(result.error)
    }
    return result
  }
  async function probeHardware() {
    if (!active) return failure('FIT', 'unavailable')
    const revision = ++hardwareRevision
    fitMirror.reset()
    const refreshed = await client.hardware.refreshSystemInfo()
    const result = refreshed.ok ? await client.hardware.getSystemInfo() : refreshed
    if (active && revision === hardwareRevision) {
      if (result.ok) fitMirror.receive({ rawHardware: result.value, profile: null, fingerprint: null })
      else fitMirror.reject(result.error)
    }
    return result
  }
  // Subscribe first, query second. Revisions stop a late query overwriting a kill
  // event or a storage-unreachable event. No update/catalog/network call on boot.
  const ready = Promise.all(subscriptions).then(async () => {
    if (active) await Promise.all([refreshEngine(), refreshLibrary(), readSettings()])
  })
  return {
    ready, probeHardware, refreshEngine, refreshLibrary, readSettings, writeSettings,
    stop() {
      if (!active) return
      active = false
      unlisteners.splice(0).forEach((unsubscribe) => unsubscribe())
      mirrors.forEach((mirror) => mirror.reset())
    },
  }
}
