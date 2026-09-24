# hb-app — Hugging Bay foundation UI (F1–F7)

The critical-path Hugging Bay screens rebuilt in the HB grammar, as a **standalone,
buildable** React + Vite + TypeScript module inside the Jan fork.

- **Verbatim copy** from `APP_SPEC.md §15.1` lives in `src/copy.ts`.
- **Design tokens** from `DESIGN_TOKENS.md` live in `src/tokens.css` (light + dark).
- **Screens:** F1 first-run, F2 discover, F3 model detail (fit verdict first),
  F4 download (journey rail), F6 chat + F8 switcher, F7 library. F8–F12 + the
  out-of-v1 items are documented in `src/screens/Backlog.tsx`.
- **Logo** assets under `public/hb/` are pixel-faithful and never restyled.

## Run / build

```bash
npm install
npm run build       # tsc -b && vite build  → dist/
npm run dev         # http://localhost:5199
npm run lint:pirate # asserts the word "pirate" is in no product UI string
```

## Relationship to the fork

Per `ENGINEERING_SPEC.md §1.4` the canonical in-tree home for these modules is
`web-app/src/hb/` (features/stores/ipc/copy/fit). Copies of the canonical
`tokens.css` and `copy` register are also placed there. Wiring this module into
Jan's Tauri renderer (TanStack Router routes, IPC to the Rust core) is the next
lane; this lane proves the UI layer builds and matches the spec + wireframes.
