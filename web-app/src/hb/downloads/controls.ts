import { ipc, type HbClient } from '../ipc'

// The F4 rail's user actions. Thin wrappers over the typed client so feature
// files never import the transport. Each fail-closes to a typed HbError when the
// native download rail is not registered — no optimistic UI state.
export const downloadControls = (client: HbClient = ipc) => ({
  pause: (taskId: string) => client.downloads.pause({ taskId }),
  resume: (taskId: string) => client.downloads.resume({ taskId }),
  cancel: (taskId: string) => client.downloads.cancel({ taskId }),
  retry: (taskId: string) => client.downloads.retry({ taskId }),
})
