import type { Settings } from '../ipc'
import { createMirror } from './mirror'
// null is an absent or unread setting, never an invented default that we save.
export const settingsMirror = createMirror<Settings | null>()
