import { describe, expect, it, vi } from 'vitest'
import { armDownload, type ArmContext } from '../fit/armDownload'
import type { HbClient } from '../ipc'
import { createClient, type Transport } from '../ipc/client'
import { armArgs } from '../ipc/schemas'

// Lane 5 / EXTEND — the expected-SHA→CHECKED thread starts here: armDownload must
// carry the catalog file's published fingerprint into downloads.arm so the native
// verifier has a reference to match the downloaded bytes to. Without this, a
// correct download can never reach CHECKED (S17) — it verifies to `failed` for
// lack of a reference. These tests pin the renderer half of that thread.

const hardware = {
  cpu: { name: 'Apple M1', core_count: 8, arch: 'aarch64', extensions: [] },
  os_type: 'macos', os_name: 'macOS', total_memory: 16384, gpus: [],
}
const baseFile = { modelId: 'org/repo', fileId: 'model.Q4.gguf', bytes: 1000, quant: 'Q4', needGB: 1 }

function fakeClient(armSpy: ReturnType<typeof vi.fn>): HbClient {
  return {
    storage: { freeSpace: vi.fn(async () => ({ ok: true, value: { bytes: 10_000_000_000, path: '/models' } })) },
    downloads: { arm: armSpy },
  } as unknown as HbClient
}

describe('armDownload — expected-fingerprint thread (§4.3, EXTEND)', () => {
  it('carries the catalog file fingerprint into downloads.arm', async () => {
    const arm = vi.fn(async () => ({ ok: true, value: { taskId: 'task-1' } }))
    const ctx: ArmContext = { hardware, file: { ...baseFile, expectedFingerprint: 'abc123' } }
    const outcome = await armDownload(
      { modelId: baseFile.modelId, fileId: baseFile.fileId, source: 'catalog' }, ctx, fakeClient(arm)
    )
    expect(outcome).toEqual({ outcome: 'armed', taskId: 'task-1' })
    expect(arm).toHaveBeenCalledWith({
      modelId: baseFile.modelId, fileId: baseFile.fileId, source: 'catalog', expectedFingerprint: 'abc123',
    })
  })

  it('omits the field when the catalog published no fingerprint (never a fabricated one)', async () => {
    const arm = vi.fn(async () => ({ ok: true, value: { taskId: 'task-2' } }))
    const ctx: ArmContext = { hardware, file: { ...baseFile } } // no expectedFingerprint
    await armDownload({ modelId: baseFile.modelId, fileId: baseFile.fileId, source: 'catalog' }, ctx, fakeClient(arm))
    const sent = arm.mock.calls[0][0] as Record<string, unknown>
    expect('expectedFingerprint' in sent).toBe(false)
  })

  it('treats a null published fingerprint as absent', async () => {
    const arm = vi.fn(async () => ({ ok: true, value: { taskId: 'task-3' } }))
    const ctx: ArmContext = { hardware, file: { ...baseFile, expectedFingerprint: null } }
    await armDownload({ modelId: baseFile.modelId, fileId: baseFile.fileId, source: 'catalog' }, ctx, fakeClient(arm))
    const sent = arm.mock.calls[0][0] as Record<string, unknown>
    expect('expectedFingerprint' in sent).toBe(false)
  })

  it('an explicit request fingerprint (receipt replay) wins over the catalog default', async () => {
    const arm = vi.fn(async () => ({ ok: true, value: { taskId: 'task-4' } }))
    const ctx: ArmContext = { hardware, file: { ...baseFile, expectedFingerprint: 'catalog-sha' } }
    await armDownload(
      { modelId: baseFile.modelId, fileId: baseFile.fileId, source: 'catalog', expectedFingerprint: 'receipt-sha' },
      ctx, fakeClient(arm)
    )
    const sent = arm.mock.calls[0][0] as Record<string, unknown>
    expect(sent.expectedFingerprint).toBe('receipt-sha')
  })

  it('the real wire contract carries expectedFingerprint through to the native handler', async () => {
    // A no-fingerprint arm stays valid (backward-compatible), and a fingerprinted
    // arm reaches the wire with the field intact — the schema half of the thread.
    expect(armArgs.safeParse({ modelId: 'm', fileId: 'f', source: 'catalog' }).success).toBe(true)
    expect(armArgs.safeParse({ modelId: 'm', fileId: 'f', source: 'catalog', expectedFingerprint: 'sha' }).success).toBe(true)
    const invoke = vi.fn<Transport['invoke']>(async () => ({ ok: true, value: { taskId: 't' } }))
    const wire: Transport = { available: () => true, invoke, listen: vi.fn() }
    const client = createClient(wire, new Set(['downloads.arm']))
    await client.downloads.arm({ modelId: 'm', fileId: 'f', source: 'catalog', expectedFingerprint: 'sha' })
    expect(invoke).toHaveBeenCalledWith('hb_downloads_arm', { modelId: 'm', fileId: 'f', source: 'catalog', expectedFingerprint: 'sha' })
  })

  it('a no-fit verdict still blocks before any arm (the fingerprint thread does not weaken the fit gate)', async () => {
    const arm = vi.fn(async () => ({ ok: true, value: { taskId: 'nope' } }))
    const bigFile = { ...baseFile, bytes: 999_000_000_000, needGB: 999, expectedFingerprint: 'abc' }
    const outcome = await armDownload(
      { modelId: baseFile.modelId, fileId: baseFile.fileId, source: 'catalog' },
      { hardware, file: bigFile }, fakeClient(arm)
    )
    expect(outcome.outcome).toBe('blocked-fit')
    expect(arm).not.toHaveBeenCalled()
  })
})
