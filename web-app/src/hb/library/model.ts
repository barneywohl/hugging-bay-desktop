import type { LibraryRecord } from '../ipc'

// Lane 5 — the F7 "Ledger" DISPLAY derivation. The library is main-owned truth
// (core scans <data>/models); the renderer MIRRORS the list. This module turns the
// raw records into the rows F7 renders and the honest totals for the storage meter.
// It invents NOTHING: sizes are the real on-disk bytes core reported, the total is
// their real sum, and a null mirror is "unknown", never an empty library.

export interface LibraryRow {
  modelId: string
  fileId: string
  size: number
  // The core verdict carried on the record (null when never checked this session).
  checkVerdict: 'matched' | 'mismatched' | 'failed' | null
  lastOpenedAt: string | null
}

export interface LibraryView {
  // null = the list has not been observed yet (F7 renders nothing, not "empty").
  rows: LibraryRow[] | null
  // The real sum of the observed model sizes — the "used for models" figure.
  usedBytes: number
  empty: boolean
}

export function deriveLibrary(records: readonly LibraryRecord[] | null): LibraryView {
  if (records == null) return { rows: null, usedBytes: 0, empty: false }
  const rows: LibraryRow[] = records.map((r) => ({
    modelId: r.modelId,
    fileId: r.fileId,
    size: r.size,
    checkVerdict: r.checkVerdict,
    lastOpenedAt: r.lastOpenedAt,
  }))
  const usedBytes = rows.reduce((sum, r) => sum + (r.size > 0 ? r.size : 0), 0)
  return { rows, usedBytes, empty: rows.length === 0 }
}
