import { ipc, type HbClient, type HbError } from '../ipc'

// The engine-load gate (§5.2 / §5.9 lock 1-2), renderer side. main enforces the
// authoritative gate before any engine code runs; the renderer refuses to even
// call load without a CHECKED verdict for the exact bytes (G2B-35: "chatting stays
// off until the check passes"). callers pass fileId only — main resolves the path.

export type StartOutcome =
  | { outcome: 'not-checked' } // no live matched verdict → G2B-35, no load
  | { outcome: 'loaded'; session: string }
  | { outcome: 'error'; error: HbError }

export const engineControls = (client: HbClient = ipc) => ({
  // The guard is explicit: `checked` MUST come from a live verify result
  // (verify/isChecked), never a cached or assumed value.
  async start(model: { modelId: string; fileId: string }, checked: boolean) {
    if (!checked) return { outcome: 'not-checked' as const }
    const result = await client.engine.load(model)
    if (result.ok) return { outcome: 'loaded' as const, session: result.value.session }
    return { outcome: 'error' as const, error: result.error }
  },
  unload: (modelId: string) => client.engine.unload({ modelId }),
  getLoaded: () => client.engine.getLoaded(),
  infer: (args: Parameters<HbClient['engine']['infer']>[0]) => client.engine.infer(args),
})
