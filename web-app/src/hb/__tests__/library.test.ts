import { describe, expect, it } from 'vitest'
import { deriveLibrary } from '../library/model'
import type { LibraryRecord } from '../ipc'

const rec = (over: Partial<LibraryRecord> = {}): LibraryRecord => ({
  modelId: 'org/repo', fileId: 'model.Q4.gguf', size: 1000,
  checkVerdict: null, lastOpenedAt: null, ...over,
})

describe('library view — F7 Ledger derivation (real sizes, unknown ≠ empty)', () => {
  it('null mirror is unknown, not empty (F7 renders nothing, never a fake empty)', () => {
    const v = deriveLibrary(null)
    expect(v.rows).toBeNull()
    expect(v.empty).toBe(false)
    expect(v.usedBytes).toBe(0)
  })

  it('an observed empty list is genuinely empty', () => {
    const v = deriveLibrary([])
    expect(v.rows).toEqual([])
    expect(v.empty).toBe(true)
    expect(v.usedBytes).toBe(0)
  })

  it('sums the real on-disk sizes for the storage figure', () => {
    const v = deriveLibrary([rec({ fileId: 'a', size: 1000 }), rec({ fileId: 'b', size: 2500 })])
    expect(v.empty).toBe(false)
    expect(v.rows).toHaveLength(2)
    expect(v.usedBytes).toBe(3500)
  })

  it('carries the core verdict and last-opened through without inventing them', () => {
    const v = deriveLibrary([rec({ checkVerdict: 'matched', lastOpenedAt: '2026-09-24' })])
    expect(v.rows?.[0].checkVerdict).toBe('matched')
    expect(v.rows?.[0].lastOpenedAt).toBe('2026-09-24')
  })

  it('a negative/garbage size never subtracts from the total', () => {
    const v = deriveLibrary([rec({ fileId: 'a', size: 1000 }), rec({ fileId: 'b', size: -5 })])
    expect(v.usedBytes).toBe(1000)
  })
})
