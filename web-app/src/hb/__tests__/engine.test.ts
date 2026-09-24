import { beforeEach, describe, expect, it } from 'vitest'
import { engineMirror, receiveEngine, selectRunningModel, selectLoadedModel } from '../stores/engine'
import { deriveEngine } from '../engine/model'
import { engineControls } from '../engine/controls'
import type { HbClient } from '../ipc/client'

// These payloads mirror synchronize.ts's engine handlers exactly, so the test
// exercises the real transition the spine produces.
const onStarting = () =>
  receiveEngine({ loaded: null, phase: 'starting', starting: { modelId: 'm' }, oom: null, crashed: null, firstToken: null, progress: null, offload: null })
const onReady = () =>
  receiveEngine({ loaded: { modelId: 'm', fileId: null }, phase: 'ready', starting: null, oom: null, crashed: null, firstToken: null, progress: null })
const onFirstToken = () =>
  receiveEngine({ firstToken: { modelId: 'm' }, phase: 'running' })

describe('engine — "running" flips ONLY on the first real token (§5.1)', () => {
  beforeEach(() => engineMirror.reset())

  it('starting is neither live nor running', () => {
    onStarting()
    const v = deriveEngine(engineMirror.getSnapshot().value)
    expect(v.running).toBe(false)
    expect(v.live).toBe(false)
    expect(selectRunningModel(engineMirror.getSnapshot().value)).toBeNull()
  })

  it('ready is LIVE but NOT running (the honesty fix)', () => {
    onStarting(); onReady()
    const state = engineMirror.getSnapshot().value
    const v = deriveEngine(state)
    expect(v.live).toBe(true)
    expect(v.running).toBe(false)
    // The IND liveness dot is on; the "it's running" claim is not.
    expect(selectLoadedModel(state)).toEqual({ modelId: 'm', fileId: null })
    expect(selectRunningModel(state)).toBeNull()
  })

  it('the first token — and only the first token — makes it running', () => {
    onStarting(); onReady()
    expect(selectRunningModel(engineMirror.getSnapshot().value)).toBeNull()
    onFirstToken()
    const state = engineMirror.getSnapshot().value
    expect(deriveEngine(state).running).toBe(true)
    expect(selectRunningModel(state)).toEqual({ modelId: 'm', fileId: null })
  })

  it('a crash clears the running claim', () => {
    onStarting(); onReady(); onFirstToken()
    receiveEngine({ loaded: null, phase: 'crashed', crashed: { modelId: 'm', kind: 'generic' }, starting: null, firstToken: null, progress: null, offload: null })
    const state = engineMirror.getSnapshot().value
    expect(deriveEngine(state).running).toBe(false)
    expect(deriveEngine(state).crashedKind).toBe('generic')
    expect(selectRunningModel(state)).toBeNull()
  })

  it('OOM surfaces the live-computed rescue, not a hardcoded one (§5.9 lock 5)', () => {
    receiveEngine({
      loaded: null, phase: 'oom',
      oom: { modelId: 'big', oomKind: 'load', biggestThatFits: { modelId: 'big', fileId: 'q3' } },
      starting: null, crashed: null, firstToken: null, progress: null, offload: null,
    })
    const v = deriveEngine(engineMirror.getSnapshot().value)
    expect(v.oom?.biggestThatFits.fileId).toBe('q3')
  })
})

describe('engine-load gate — CHECKED for exact bytes (§5.2 / G2B-35)', () => {
  const client = {
    engine: { load: async () => ({ ok: true, value: { session: 's1' } }) },
  } as unknown as HbClient

  it('refuses to load without a live matched verdict', async () => {
    const out = await engineControls(client).start({ modelId: 'm', fileId: 'f' }, false)
    expect(out.outcome).toBe('not-checked')
  })

  it('loads once checked', async () => {
    const out = await engineControls(client).start({ modelId: 'm', fileId: 'f' }, true)
    expect(out).toEqual({ outcome: 'loaded', session: 's1' })
  })

  it('surfaces a typed error when the engine is unavailable', async () => {
    const unavailable = {
      engine: { load: async () => ({ ok: false, error: { code: 'HB-ENGINE-UNAVAILABLE', kind: 'unavailable' } }) },
    } as unknown as HbClient
    const out = await engineControls(unavailable).start({ modelId: 'm', fileId: 'f' }, true)
    expect(out.outcome).toBe('error')
  })
})
