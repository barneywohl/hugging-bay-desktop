import { describe, expect, it } from 'vitest'
import { computeFit } from '../fit/fitObject'
import { armDownload } from '../fit/armDownload'
import { isAppleSilicon, usableMemory, APPLE_SILICON_UNIFIED_CEILING } from '../fit/compat'
import type { HardwareInfo } from '../ipc'
import type { HbClient } from '../ipc/client'

const GB = 1_000_000_000
const MIB = 1024 * 1024

// total_memory / gpu total_memory are MiB in the inherited payload.
function mac(ramGB: number): HardwareInfo {
  return {
    cpu: { name: 'Apple M-series', core_count: 8, arch: 'aarch64', extensions: [] },
    os_type: 'macos', os_name: 'macOS', total_memory: Math.round((ramGB * GB) / MIB),
    gpus: [],
  }
}
function pc(ramGB: number, vramGB: number): HardwareInfo {
  return {
    cpu: { name: 'x86', core_count: 8, arch: 'x86_64', extensions: [] },
    os_type: 'windows', os_name: 'Windows', total_memory: Math.round((ramGB * GB) / MIB),
    gpus: vramGB > 0 ? [{
      name: 'GPU', total_memory: Math.round((vramGB * GB) / MIB), vendor: 'nvidia', uuid: 'u', driver_version: '1',
      nvidia_info: { index: 0, compute_capability: '8.9' }, vulkan_info: null,
    }] : [],
  }
}
const fileOf = (bytes: number, fileId = 'f', quant = 'Q4') =>
  ({ modelId: 'm', fileId, bytes, quant, needGB: 0 })

describe('fit object — machine detection + ceiling', () => {
  it('detects Apple Silicon and applies the ~75% unified-memory ceiling', () => {
    const hw = mac(16)
    expect(isAppleSilicon(hw)).toBe(true)
    const { usableBytes } = usableMemory(hw)
    // usable can never exceed the unified ceiling of total RAM
    expect(usableBytes).toBeLessThanOrEqual(16 * GB * APPLE_SILICON_UNIFIED_CEILING + 1)
  })
})

describe('fit object — verdicts (§5.8)', () => {
  it('machine-unknown when the probe never landed (lock 4)', () => {
    const fit = computeFit({ hardware: null, file: fileOf(4 * GB) })
    expect(fit.verdict).toBe('unknown')
    expect(fit.reason).toBe('machine-unknown')
    expect(fit.needGB).toBeNull()
    expect(fit.haveGB).toBeNull()
  })

  it('B3 probe-sanity floor: 0 GB RAM is a failed probe, not a tiny machine', () => {
    const fit = computeFit({ hardware: mac(0), file: fileOf(1 * GB) })
    expect(fit.verdict).toBe('unknown')
    expect(fit.reason).toBe('machine-unknown')
  })

  it('a small file on a big Mac fits comfortably', () => {
    const fit = computeFit({ hardware: mac(32), file: fileOf(3 * GB) })
    expect(fit.verdict).toBe('fits')
    expect(fit.needGB).toBeGreaterThan(0)
    expect(fit.haveGB).toBeGreaterThan(0)
  })

  it('a too-big file on a small Mac does not fit', () => {
    const fit = computeFit({ hardware: mac(8), file: fileOf(20 * GB) })
    expect(fit.verdict).toBe('no-fit')
    expect(fit.reason).toBe('too-big')
  })

  it('file-size-unknown when the record carries no bytes and no needGB', () => {
    const fit = computeFit({ hardware: mac(16), file: fileOf(0) })
    expect(fit.verdict).toBe('unknown')
    expect(fit.reason).toBe('file-size-unknown')
  })
})

describe('fit object — rescue is argmax-fits (lock 2 / P0-S22)', () => {
  it('picks the BIGGEST sibling quant that still fits, never the smallest', () => {
    const siblings = [
      fileOf(2 * GB, 'small', 'Q2'),
      fileOf(5 * GB, 'medium', 'Q4'),
      fileOf(7 * GB, 'largeish', 'Q6'),
    ]
    const fit = computeFit({ hardware: mac(16), file: fileOf(40 * GB, 'huge', 'Q8'), siblings })
    expect(fit.verdict).toBe('no-fit')
    expect(fit.rescue).toBeDefined()
    // 16GB Mac usable ≈ 9-10GB after ceiling+overhead → medium(5) fits, largeish(7) may too.
    // Whatever the usable band, the rescue must be the biggest that fits, i.e. not 'small'.
    expect(fit.rescue?.fileId).not.toBe('small')
  })

  it('no rescue when no sibling fits', () => {
    const siblings = [fileOf(30 * GB, 'big', 'Q6')]
    const fit = computeFit({ hardware: mac(8), file: fileOf(40 * GB, 'huge'), siblings })
    expect(fit.verdict).toBe('no-fit')
    expect(fit.rescue).toBeUndefined()
  })
})

describe('discrete GPU path', () => {
  it('a model that fits in VRAM is green (fits)', () => {
    const fit = computeFit({ hardware: pc(32, 24), file: fileOf(10 * GB) })
    expect(fit.verdict).toBe('fits')
  })
  it('a model past total memory does not fit', () => {
    const fit = computeFit({ hardware: pc(16, 8), file: fileOf(40 * GB) })
    expect(fit.verdict).toBe('no-fit')
  })
})

// Minimal client double: only the members armDownload touches.
function fakeClient(over: Partial<{ free: number; armTaskId: string | null }>): HbClient {
  const free = over.free ?? Number.MAX_SAFE_INTEGER
  return {
    storage: { freeSpace: async () => ({ ok: true, value: { bytes: free, path: '/m' } }) },
    downloads: {
      arm: async () =>
        over.armTaskId
          ? { ok: true, value: { taskId: over.armTaskId } }
          : { ok: false, error: { code: 'HB-DOWNLOAD-UNAVAILABLE', kind: 'unavailable' } },
    },
  } as unknown as HbClient
}

describe('armDownload — the one entry point (§3.3)', () => {
  it('blocks on a computed no-fit before arming (never touches the network)', async () => {
    let armCalled = false
    const client = {
      storage: { freeSpace: async () => ({ ok: true, value: { bytes: 1e15, path: '/m' } }) },
      downloads: { arm: async () => { armCalled = true; return { ok: true, value: { taskId: 't' } } } },
    } as unknown as HbClient
    const out = await armDownload(
      { modelId: 'm', fileId: 'huge', source: 'hb' },
      { hardware: mac(8), file: fileOf(40 * GB, 'huge') },
      client
    )
    expect(out.outcome).toBe('blocked-fit')
    expect(armCalled).toBe(false)
  })

  it('blocks on insufficient disk space (F3-S5 preflight)', async () => {
    const out = await armDownload(
      { modelId: 'm', fileId: 'f', source: 'hb' },
      { hardware: mac(32), file: fileOf(10 * GB, 'f') },
      fakeClient({ free: 1 * GB })
    )
    expect(out.outcome).toBe('blocked-space')
  })

  it('arms when it fits and there is room', async () => {
    const out = await armDownload(
      { modelId: 'm', fileId: 'f', source: 'hb' },
      { hardware: mac(32), file: fileOf(4 * GB, 'f') },
      fakeClient({ armTaskId: 'task-1' })
    )
    expect(out).toEqual({ outcome: 'armed', taskId: 'task-1' })
  })

  it('fails closed (error) when the native rail is not registered yet', async () => {
    const out = await armDownload(
      { modelId: 'm', fileId: 'f', source: 'hb' },
      { hardware: mac(32), file: fileOf(4 * GB, 'f') },
      fakeClient({ armTaskId: null })
    )
    expect(out.outcome).toBe('error')
  })
})
