# Significant changes from Jan (Apache License 2.0, Section 4(b))

This file records the significant changes the **Hugging Bay** fork makes to the
upstream **Jan** work (`janhq/jan`, © 2025 Menlo Research). It satisfies the
Apache 2.0 requirement to state, prominently, that files were changed. It is
maintained alongside the code.

## v1 foundation lane (2026-09-24)

### Product identity
- Renamed the product from **Jan** to **The Hugging Bay** everywhere user-facing:
  Tauri `productName`, binary name, bundle identifier, window title, installer
  window, HTML document title, and the About surface. Internal package names,
  import paths (`@janhq/*`), and data-folder API identifiers are left unchanged
  in this lane to keep the fork building; they are engineering identifiers, not
  user-facing product names.
- Added the Hugging Bay logo assets (pixel-faithful mark, never restyled) under
  `web-app/public/hb/` and `src-tauri/icons/` derivation notes.

### License obligations
- Replaced the short upstream `LICENSE` notice with the **full Apache 2.0 text**,
  keeping the upstream **Menlo Research attribution block** at the top and adding
  the fork's modification notice.
- Added `NOTICE` (retained upstream attribution + no-endorsement statement),
  `FORK_NOTICE.md`, and this `CHANGES.md`.
- Updated the About surface to read: "Built on Jan. © 2025 Menlo Research.
  Apache License 2.0." and "This is a modified fork of Jan.", with links to the
  changes and the license.

### Design system + copy
- Added the Hugging Bay design tokens (`--hb-*`: app bg `#EDF0F5`, navy
  `#142A4D`, primary `#1668D9`; full light/dark set) and the verbatim copy
  register (every `[EXACT]` string from the app spec) as canonical modules.

### Critical-path screens rebuilt in the Hugging Bay grammar
- F1 first-run ("The Quiet Minute"), F2 discover ("The Quiet Shelf"), F3 model
  detail ("The Verdict Screen" — fit verdict first), F4 download (single journey
  rail: Getting → Checking → Ready), F6 chat + model switcher, and F7 library
  ("The Ledger") rebuilt to the spec + wireframes: one primary action per screen,
  no modal popups, verdict-before-CTA, and verification claims never overstated
  ("the check proves the file arrived unchanged, not that the model is safe").
- These ship as a buildable Hugging Bay UI module (`hb-app/`). The canonical
  in-tree home per the engineering spec is `web-app/src/hb/`; wiring the module
  into Jan's Tauri renderer is the next lane.

### Novice cut (planned, per the engineering spec — not all removed in this lane)
The following upstream surfaces are **out of scope for v1** and are slated for
removal / gating in subsequent lanes: the agentic coding loop (`core/agent`),
MCP servers, the local API server (`core/server` — no listening sockets in v1),
RAG / vector-db / web-search plugins, the cloud-provider integrations, the
custom-model (AddModel) dialog, and the multi-page settings tree (replaced by a
four-row settings surface + an Advanced menu). This lane documents them here and
in the plan; it does not delete upstream modules yet, to keep the fork building.

## How modified files are marked
Where an upstream file carries a header, this fork appends a
"Modified by the Hugging Bay fork" line. New files created by this fork carry
`Copyright 2026 Hugging Bay contributors` and the Apache 2.0 reference.
