import type { CatalogCache } from '../ipc'
import { createMirror } from './mirror'

// The catalog is main-owned truth (core/hb/catalog). null = never read; it is
// NOT an empty catalog. No boot fetch: the spine reads the LOCAL cache on demand
// and only refreshes (network) on an explicit user action — the zero-added-egress
// law (§0.6 law 7). Records are catalog file rows the screens render read-only.
export const catalogMirror = createMirror<CatalogCache>()
