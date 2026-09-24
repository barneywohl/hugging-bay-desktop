import type { LibraryRecord } from '../ipc'
import { createMirror } from './mirror'

// null != []: unknown cannot be presented as an empty library.
// A list snapshot is not verification authority; sizes must be re-measured by
// storage.measure at render. Nothing is hydrated from a previous renderer session.
export const libraryMirror = createMirror<readonly LibraryRecord[]>()
