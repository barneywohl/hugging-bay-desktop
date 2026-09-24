import { ipc, type HbClient } from '../ipc'

// F7 "The Ledger" user actions. Thin wrappers over the typed client so feature
// files never import the transport (mirror-boundary law). Each fail-closes to a
// typed HbError when the native storage surface is not registered — no optimistic
// UI state, no fabricated success. delete is a soft-delete (core moves the model
// to .trash); restore brings it back; purge removes it permanently; measure and
// freeSpace read real bytes for the honest meter.
export const libraryControls = (client: HbClient = ipc) => ({
  delete: (modelId: string) => client.library.delete({ modelId }),
  restore: (modelId: string) => client.library.restore({ modelId }),
  purge: (modelId: string) => client.library.purge({ modelId }),
  measure: (modelId: string) => client.storage.measure({ modelId }),
  freeSpace: () => client.storage.freeSpace(),
})
