import { describe, expect, it } from 'vitest'
import { deriveVerify, isChecked } from '../verify/model'
import type { VerificationObservation } from '../stores/verify'

const F = 'file-1'

describe('verify view — CHECKED binds only to a live matched result (§4.3)', () => {
  it('idle when nothing observed', () => {
    expect(deriveVerify(F, undefined).phase).toBe('idle')
    expect(deriveVerify(F, { progress: null, result: null }).phase).toBe('idle')
    expect(isChecked(deriveVerify(F, undefined))).toBe(false)
  })

  it('checking with a real determinate pct (A7 — no timer, no estimate)', () => {
    const obs: VerificationObservation = { progress: { fileId: F, bytesHashed: 250, bytesTotal: 1000 }, result: null }
    const v = deriveVerify(F, obs)
    expect(v.phase).toBe('checking')
    expect(v.pct).toBe(25)
    expect(isChecked(v)).toBe(false)
  })

  it('progress with no total shows no pct', () => {
    const obs: VerificationObservation = { progress: { fileId: F, bytesHashed: 250, bytesTotal: 0 }, result: null }
    expect(deriveVerify(F, obs).pct).toBeNull()
  })

  it('CHECKED only on matched — carries the fingerprint compared', () => {
    const obs: VerificationObservation = { progress: null, result: { fileId: F, verdict: 'matched', fingerprintChecked: '9f3a' } }
    const v = deriveVerify(F, obs)
    expect(v.phase).toBe('checked')
    expect(isChecked(v)).toBe(true)
    expect(v.fingerprintChecked).toBe('9f3a')
  })

  it('mismatch is never checked', () => {
    const obs: VerificationObservation = { progress: null, result: { fileId: F, verdict: 'mismatched', fingerprintChecked: '00' } }
    const v = deriveVerify(F, obs)
    expect(v.phase).toBe('mismatch')
    expect(isChecked(v)).toBe(false)
  })

  it('hash-threw is failed, honestly not checked', () => {
    const obs: VerificationObservation = { progress: null, result: { fileId: F, verdict: 'failed', fingerprintChecked: null } }
    const v = deriveVerify(F, obs)
    expect(v.phase).toBe('failed')
    expect(isChecked(v)).toBe(false)
  })

  it('a live result supersedes stale progress (no cached mid-run pct as verdict)', () => {
    const obs: VerificationObservation = {
      progress: { fileId: F, bytesHashed: 999, bytesTotal: 1000 },
      result: { fileId: F, verdict: 'matched', fingerprintChecked: 'abc' },
    }
    expect(deriveVerify(F, obs).phase).toBe('checked')
  })
})
