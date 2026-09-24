import type { HardwareInfo, MachineProfile } from '../ipc'
import { createMirror } from './mirror'

export interface FitMirror {
  rawHardware: HardwareInfo | null
  profile: MachineProfile | null
  fingerprint: string | null
}
// No fit verdict here. The sole pure FitObject constructor belongs in hb/fit
// (Lane 1); raw probe success is not a successful fit claim.
export const fitMirror = createMirror<FitMirror>()
