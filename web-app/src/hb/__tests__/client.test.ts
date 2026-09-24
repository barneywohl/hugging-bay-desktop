import { describe, expect, it, vi } from 'vitest'
import { createClient, type Transport } from '../ipc/client'
import { commands, events, type CommandName } from '../ipc/contracts'
import { checkResult, type Settings } from '../ipc/schemas'

const preferences: Settings = {
  schemaVersion: 1, downloads: { allowMetered: false }, updates: { automaticChecks: false },
  appearance: { theme: 'system' }, advanced: { enabled: false },
}
function transport() {
  return { available: () => true, invoke: vi.fn<Transport['invoke']>(), listen: vi.fn<Transport['listen']>() }
}

describe('typed boundary honesty', () => {
  it('does not invoke missing HB commands or fallback to unchecked Jan loading', async () => {
    const wire = transport()
    const client = createClient(wire)
    expect(await client.engine.load({ modelId: 'm', fileId: 'f' })).toEqual({ ok: false, error: { code: 'HB-ENGINE-UNAVAILABLE', kind: 'unavailable' } })
    expect(await client.downloads.arm({ modelId: 'm', fileId: 'f', source: 'detail' })).toMatchObject({ ok: false })
    expect(wire.invoke).not.toHaveBeenCalled()
  })
  it('normalizes web-preview and rejected invokes to errors without leaking raw exceptions', async () => {
    const wire = transport()
    wire.available = () => false
    expect(await createClient(wire).hardware.getSystemInfo()).toMatchObject({ ok: false, error: { kind: 'unavailable' } })
    wire.available = () => true
    wire.invoke.mockRejectedValue('sensitive local path /Users/example')
    expect(await createClient(wire).hardware.getSystemInfo()).toEqual({ ok: false, error: { code: 'HB-FIT-TRANSPORT', kind: 'transport' } })
  })
  it('preserves the real hardware units and nullable GPU fields', async () => {
    const wire = transport()
    const raw = { cpu: { name: 'Apple M1', arch: 'aarch64', core_count: 8, extensions: [] }, os_type: 'macos', os_name: 'macOS', total_memory: 8192, gpus: [] }
    wire.invoke.mockResolvedValue(raw)
    expect(await createClient(wire).hardware.getSystemInfo()).toEqual({ ok: true, value: raw })
    expect(wire.invoke).toHaveBeenCalledWith('plugin:hardware|get_system_info', {})
  })
  it('validates both sides of an implemented command and requires HbResult', async () => {
    const wire = transport()
    const client = createClient(wire, new Set<CommandName>(['verify.start']))
    wire.invoke.mockResolvedValue({ checkId: 'c' })
    expect(await client.verify.start({ fileId: 'f' })).toMatchObject({ ok: false, error: { kind: 'invalid-payload' } })
    wire.invoke.mockResolvedValue({ ok: true, value: { checkId: 'c' } })
    expect(await client.verify.start({ fileId: 'f' })).toEqual({ ok: true, value: { checkId: 'c' } })
    // Even JS/untyped consumers cannot smuggle a path into verification.
    const withPath = { fileId: 'f', path: '/tmp/untrusted' }
    const calls = wire.invoke.mock.calls.length
    expect(await client.verify.start(withPath)).toMatchObject({ ok: false })
    expect(wire.invoke).toHaveBeenCalledTimes(calls)
  })
  it('rejects CHECKED without a fingerprint, invalid progress, and unsafe u64 values', () => {
    expect(checkResult.safeParse({ fileId: 'f', verdict: 'matched', fingerprintChecked: null }).success).toBe(false)
    expect(events['check/progress'].safeParse({ fileId: 'f', bytesHashed: -1, bytesTotal: 10 }).success).toBe(false)
    expect(events['download/progress'].safeParse({ taskId: 't', bytesReceived: Number.MAX_SAFE_INTEGER + 1, totalBytes: 100, speedBps: 1 }).success).toBe(false)
  })
  it('validates event data before a subscriber sees it', async () => {
    const wire = transport()
    let receive: ((payload: unknown) => void) | undefined
    wire.listen.mockImplementation(async (_event, handler) => { receive = handler; return vi.fn() })
    const handler = vi.fn(), error = vi.fn()
    await createClient(wire).on('check/result', handler, error)
    receive?.({ fileId: 'f', verdict: 'matched', fingerprintChecked: null })
    expect(handler).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ kind: 'invalid-payload' }))
    receive?.({ fileId: 'f', verdict: 'matched', fingerprintChecked: 'sha256' })
    expect(handler).toHaveBeenCalledOnce()
  })
  it('keeps internal actions out of both Tauri registries', () => {
    for (const name of ['engine.quant_fallback', 'fit.quant_fallback_offered', 'engine.stalled', 'engine.stopped', 'engine/starting-gpu-test', 'engine/gpu-test-passed', 'timers.audit']) {
      expect(name in commands).toBe(false)
      expect(name in events).toBe(false)
    }
    expect('engine/loaded' in events).toBe(false)
  })
})

describe('settings read-back', () => {
  it('keeps missing settings unknown without writing defaults', async () => {
    const wire = transport()
    wire.invoke.mockResolvedValue(null)
    expect(await createClient(wire).settings.read()).toEqual({ ok: true, value: null })
    expect(wire.invoke).toHaveBeenCalledExactlyOnceWith('settings_get', { key: 'hb.settings.v1' })
  })
  it('rejects invalid settings and a write that did not apply', async () => {
    const wire = transport()
    wire.invoke.mockResolvedValueOnce('broken json')
    expect(await createClient(wire).settings.read()).toMatchObject({ ok: false, error: { kind: 'invalid-payload' } })
    wire.invoke.mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    expect(await createClient(wire).settings.write(preferences)).toMatchObject({ ok: false, error: { kind: 'write-not-applied' } })
  })
  it('serializes concurrent write/read-back pairs and returns only confirmed values', async () => {
    const wire = transport()
    let saved: string | null = null
    wire.invoke.mockImplementation(async (command, args) => {
      if (command === 'settings_set') { saved = args.value as string; return null }
      return saved
    })
    const client = createClient(wire)
    const second: Settings = { ...preferences, appearance: { theme: 'dark' } }
    expect(await Promise.all([client.settings.write(preferences), client.settings.write(second)])).toEqual([
      { ok: true, value: preferences }, { ok: true, value: second },
    ])
    expect(wire.invoke.mock.calls.map(([name]) => name)).toEqual(['settings_set', 'settings_get', 'settings_set', 'settings_get'])
  })
})
