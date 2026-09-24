# web-app/src/hb — Hugging Bay modules (canonical in-tree home)

Per `ENGINEERING_SPEC.md §1.4`, the Hugging Bay UI layer lives here:
`features/*`, `stores/*`, `ipc/*`, `copy/*`, `fit/*`.

Landed in the foundation lane:
- `tokens.css` — the design tokens (light + dark), canonical copy of the
  DESIGN_TOKENS.md values. A hex literal outside this file is a lint failure.
- `copy/strings.ts` — the verbatim `[EXACT]` copy register (APP_SPEC §15.1).

The buildable rebuild of the critical-path screens (F1–F7) that consumes these
lives at the repo root in `hb-app/` (self-contained, `npm run build` green).
The next lane wires these into Jan's TanStack Router renderer + the Rust core
IPC described in ENGINEERING_SPEC §1–§8.
