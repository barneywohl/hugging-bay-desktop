# Hugging Bay renderer — Lane 0

This is the mounted Tauri renderer's HB home. `hb-app/` is a separate mock and is
not part of the production entry graph. Lane 0 supplies shells and contracts, not
an implemented download → verification → chat journey.

## Public boundaries

- `ipc/index.ts`: `ipc.downloads`, `verify`, `machine`, `hardware`, `storage`,
  `connectivity`, `engine`, `threads`, `library`, `updates`, `catalog`,
  `diagnostics`, `notify`, `shortlist`, `settings`, and typed `ipc.on`.
- `ipc/contracts.ts`: all §2.2 wire commands and §2.4 public events, with Zod
  argument, result and event schemas. All commands return `HbResult<T>`.
  Rejected invokes and malformed envelopes are typed errors; raw exceptions never
  become copy. Unsafe JSON u64 numbers are rejected rather than rounded.
- `stores/index.ts`: selector hooks only. No public `setState`, persist middleware,
  localStorage, mock data or optimistic durable transitions. `null` is unknown;
  it never means an empty library, verified file or running engine.
- `stores/synchronize.ts`: subscription/session lifetime, response mirroring and
  stale-response protection. Dispose before a pending `listen` resolves is safe.
  Settings mutations apply only after core read-back matches the write.
- `copy/strings.ts` and `tokens.css`: the only rendered copy and color sources.
  `copy/locks.json` holds independent SHA-256 lock assertions, not alternate copy.
  Scaffold labels in `COPY.shell` are not claimed to have a Jev pass.

## Live versus planned IPC

The existing Rust registrations support these live adapters:

| Client | Literal native command | Notes |
| --- | --- | --- |
| `hardware.getSystemInfo()` | `plugin:hardware\|get_system_info` | Raw payload; RAM/VRAM in **MiB**, null GPU vendor fields preserved |
| `hardware.getSystemUsage()` | `plugin:hardware\|get_system_usage` | Measured usage, also MiB |
| `hardware.refreshSystemInfo()` | `plugin:hardware\|refresh_system_info` | Invalidates native cache before a requested probe |
| `settings.read()` | `settings_get` | HB key `hb.settings.v1`; no boot defaults or writes |
| `settings.write(value)` | `settings_set`, then `settings_get` | Serialized write/read-back; native store flush remains core's responsibility |

**None of the new HB §2.2 wire commands is registered in this fork yet.** Their
wrappers return `HB-{AREA}-UNAVAILABLE` without sending an unregistered command.
`implementedCommands` is deliberately empty. Each owning lane must add its native
registration, validate the contract, and then enable that command. Never alias
`engine.load` to legacy `load_model`: the latter lacks the checked-file gate.
Browser preview has no Tauri and returns the same honest unavailable result.

`machine.probe` is **not** silently aliased to Jan's hardware command. The HB
profile/fingerprint/cache and measured Metal working-set extension do not exist
in core yet. Lane 1 can use the real `hardware` adapter and raw `fit` mirror now;
zeros/missing probe fields must yield unknown, with no guessed fingerprint or
Metal measurement. The preserved `useHardware.ts` and `modelCompatibility.ts`
remain available for KEEP/EXTEND work, unchanged by Lane 0.

The specification leaves some schemas as `respective` / `…`: TaskReceipt,
MachineProfile, thread CRUD/inference, catalog records and AppUpdateState have
explicit **provisional extension shapes** here. Settings' HB-specific document
shape is also a renderer integration choice, not a pre-existing Rust HB schema.
Confirm these with the owning native lane before enabling their commands.

Spec discrepancies are not silently renamed: §1 calls `downloads.start_task`,
but the authoritative §2.2 calls `downloads.start`, which is the typed wire name.
The five renderer-only action types in §2.5 (plus the two internal GPU-test rows)
are separate from the Tauri registry. `timers.audit` is typed for the audit harness
only: its dot is illegal in Tauri event names, so a native wire decision remains.

## Mirror ownership

| Hook | Value (all start null) | Authority |
| --- | --- | --- |
| `useDownloadStore` | taskId → last typed payload for each download event | `download/*`; only `download/state.to` supplies an S-state |
| `useVerifyStore` | fileId → progress and result | `check/progress`, `check/result`; matched requires a fingerprint |
| `useEngineStore` | loaded model/file, phase, starting/progress/pressure/offload/OOM/crash/first-token | `engine/*`, `engine.get_loaded`; ready event has no fileId so it stays null |
| `useFitStore` | raw hardware, optional HB profile and fingerprint | real native probe / machine events; **no fit constructor in Lane 0** |
| `useLibraryStore` | current library records | `library.list`; root changes invalidate rows; sizes require fresh `storage.measure` at render |
| `useSettingsStore` | confirmed HB preferences | native get and write-read-back |

Every mirror also has `error: HbError | null`. A rejected refresh drops the stale
value. Verification is invalidated by a new hash/download, storage movement or
unreachability, and session disposal. `verify.status` is a press-time gate, not a
cached CHECKED badge. Download completion/state never manufactures that badge.

Engine queries cannot overwrite a newer event; external kill clears its running
projection synchronously when the core event arrives. Native event emission and
its <=1s kill detection are **not** proven by renderer tests. Download relaunch
hydration needs a native snapshot/replay contract (missing in §2.2); this lane does
not invent an empty task list or a synthetic receipt.

## Routes and gates

`/` → F1, `/discover` → F2/F11, `/models/$modelId` → F3/F5/F11,
`/downloads` and `/downloads/$taskId` → F4/F5, `/chat` and `/chat/$threadId` →
F6/F8, `/library` → F7, `/updates` → F9, `/settings` → four inert rows and an
Advanced disclosure. These are explicitly unavailable shells. F12 has a typed
failure shell; its complete grammar remains Lane 5. The F10 proof claim is never
rendered on these shells.

Jan cowork/artifacts/projects/logs/system-monitor/local-api/settings routes and
their obsolete sidebar/settings/setup consumers are removed. The HB root does
not mount Jan's provider/service boot. Analytics provider/consent/store and
PostHog dependency, GA HTML injection and telemetry build constants are removed.
No catalog, update, model, notification or network operation starts on HB boot.
This is not a native egress-audit or network-namespace proof.

Run from the repo root (Node + Corepack):

```
corepack yarn install --immutable
corepack yarn workspace @janhq/core build
(cd src-tauri/plugins && corepack yarn install --immutable && corepack yarn workspaces foreach -Apt run build)
corepack yarn workspace @janhq/web-app build
corepack yarn workspace @janhq/web-app test:hb
```

The plugin build above builds **JavaScript APIs only**, not Rust/Tauri.
`build` requires `lint:hb`, `tsc -b` on the **entire existing src tree** (no narrowed
TypeScript scope), and Vite. `lint:hb` checks HB, routes and entrypoint plus copy
hashes and token literals. Vite also lints its full source import closure: a
feature cannot evade the boundary by importing an inherited Jan adapter. Its
`dist/hb-renderer-audit.json` records the modules checked, without asserting native
egress compliance. The no-invoke rule is also enabled on the rest of src;
retained, unmounted Jan files still contain violations and must migrate through
the boundary before rejoining the HB entry graph. The repository-wide lint is
not claimed green. ESLint tests reject aliases/dynamic raw transport imports,
inline/paraphrased JSX copy, feature-to-mirror mutation imports and persistence.
