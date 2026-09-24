import { describe, expect, it } from 'vitest'
import { deriveTask, deriveAll } from '../downloads/model'
import type { DownloadObservation } from '../stores/download'
import type { DownloadState } from '../ipc'

const T = 't1'
const state = (to: DownloadState, from: DownloadState = 'S2'): DownloadObservation =>
  ({ 'download/state': { taskId: T, from, to } })
const progress = (bytesReceived: number, totalBytes: number, speedBps = 0): DownloadObservation =>
  ({ 'download/progress': { taskId: T, bytesReceived, totalBytes, speedBps } })

describe('download view — phase mapping (§3.1 / §3.8)', () => {
  it('idle when no state observed', () => {
    expect(deriveTask(T, undefined).phase).toBe('idle')
    expect(deriveTask(T, {}).phase).toBe('idle')
  })
  it('S1/S19 → queued', () => {
    expect(deriveTask(T, state('S1')).phase).toBe('queued')
    expect(deriveTask(T, state('S19')).phase).toBe('queued')
  })
  it('S2–S13 → getting', () => {
    for (const s of ['S2', 'S3', 'S5', 'S8', 'S10', 'S13'] as DownloadState[]) {
      expect(deriveTask(T, state(s)).phase).toBe('getting')
    }
  })
  it('S14–S16 → checking', () => {
    for (const s of ['S14', 'S15', 'S16'] as DownloadState[]) {
      expect(deriveTask(T, state(s)).phase).toBe('checking')
    }
  })
  it('S17 → ready with matched verdict', () => {
    const v = deriveTask(T, state('S17'))
    expect(v.phase).toBe('ready')
    expect(v.checkVerdict).toBe('matched')
  })
  it('S18 → failed-check (mismatch by default)', () => {
    expect(deriveTask(T, state('S18')).phase).toBe('failed-check')
    expect(deriveTask(T, state('S18')).checkVerdict).toBe('mismatched')
  })
  it('S18 with a failed event → failed verdict', () => {
    const obs: DownloadObservation = {
      ...state('S18'),
      'download/failed': { taskId: T, error: { code: 'HB-CHECK-CORE', kind: 'core' } },
    }
    expect(deriveTask(T, obs).checkVerdict).toBe('failed')
  })
  it('C1A / C2E → canceled and terminal', () => {
    expect(deriveTask(T, state('C1A')).phase).toBe('canceled')
    expect(deriveTask(T, state('C2E')).terminal).toBe(true)
  })
})

describe('download view — earned numbers only (§0.6 law 5, §3.6)', () => {
  it('pct only when a real total is known', () => {
    const noTotal = { ...state('S3'), ...progress(500, 0) }
    expect(deriveTask(T, noTotal).pct).toBeNull()
    const withTotal = { ...state('S3'), ...progress(500, 1000) }
    expect(deriveTask(T, withTotal).pct).toBe(50)
  })
  it('pct is clamped to 100', () => {
    const over = { ...state('S3'), ...progress(1200, 1000) }
    expect(deriveTask(T, over).pct).toBe(100)
  })
  it('eta is null unless the core marked it earned', () => {
    const notEarned = { ...state('S3'), ...progress(500, 1000, 100) }
    expect(deriveTask(T, notEarned).etaMinutes).toBeNull()
    const earned: DownloadObservation = {
      ...state('S3'),
      ...progress(500, 60_500, 500),
      'download/etawatch': { taskId: T, verdict: 'earned' },
    }
    expect(deriveTask(T, earned).etaMinutes).toBe(2)
  })
  it('withdrawn eta does not render a number', () => {
    const withdrawn: DownloadObservation = {
      ...state('S4'),
      ...progress(500, 60_500, 500),
      'download/etawatch': { taskId: T, verdict: 'withdrawn' },
    }
    expect(deriveTask(T, withdrawn).etaMinutes).toBeNull()
  })
})

describe('download view — honest sub-states', () => {
  it('paused states set paused', () => {
    expect(deriveTask(T, state('S8')).paused).toBe(true)
    expect(deriveTask(T, state('S6')).paused).toBe(true)
    expect(deriveTask(T, state('S3')).paused).toBe(false)
  })
  it('reasons map from state', () => {
    expect(deriveTask(T, state('S5')).reason).toBe('slow')
    expect(deriveTask(T, state('S9')).reason).toBe('offline')
    expect(deriveTask(T, state('S10')).reason).toBe('space')
    expect(deriveTask(T, state('S13')).reason).toBe('metered')
  })
  it('C4 auto-resume beat surfaces only from a real resumed event', () => {
    expect(deriveTask(T, state('S3')).resumedFrom).toBeNull()
    const resumed: DownloadObservation = {
      ...state('S3'),
      'download/resumed': { taskId: T, fromState: 'S9' },
    }
    expect(deriveTask(T, resumed).resumedFrom).toBe('S9')
  })
  it('checkpoint bytes back the progress when no live progress event', () => {
    const cp: DownloadObservation = {
      ...state('S3'),
      'download/checkpoint': { taskId: T, bytesReceived: 4096 },
    }
    expect(deriveTask(T, cp).bytesReceived).toBe(4096)
  })
})

describe('deriveAll', () => {
  it('null mirror → empty; maps every task', () => {
    expect(deriveAll(null)).toEqual([])
    const mirror = { a: state('S3'), b: state('S17') }
    const views = deriveAll(mirror)
    expect(views).toHaveLength(2)
    expect(views.map((v) => v.phase).sort()).toEqual(['getting', 'ready'])
  })
})
