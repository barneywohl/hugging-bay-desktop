import { ipc, type HbClient } from '../ipc'

// F5 verification actions over the typed client. callers pass fileId only — main
// resolves fileId→path from the library store (A6 lock 4). recheck always starts a
// fresh run (A6 lock 1); it works offline because the fingerprint rides in the
// receipt (O-P40). Fail-closed until core/hb/verifier registers.
export const verifyControls = (client: HbClient = ipc) => ({
  start: (fileId: string) => client.verify.start({ fileId }),
  recheck: (fileId: string) => client.verify.recheck({ fileId }),
  status: (fileId: string) => client.verify.status({ fileId }),
})
