/* Documented, not hidden. The remaining v1 flows and the explicitly out-of-v1
 * items are surfaced here as an honest backlog (per DESKTOP_PLAN §2). This lane
 * ships F1-F4, F6, F7 in the HB grammar; the rest are stubbed with their
 * verdicts. Subsequent lanes finish F8-F12 + polish. */
export function Backlog() {
  const v1Remaining = [
    ['F8 engine / switcher', 'SHIP — loading, quant fallback, OOM rescue, memory pressure, switcher sheet (sheet partly built in Chat)'],
    ['F9 updates (app + model)', 'SHIP — banner state machine, model-update rails; FC-A16 founder final approval'],
    ['F10 settings full', 'SHIP (V-MAX 83.8) — four rows built; Downloads/Updates detail panels + proof screen pending'],
    ['F11 weak hardware', 'SHIP — fit gate wired into F3; 3-question wizard door, estimate→probe reconciliation (H-APP-4) pending'],
    ['F12 failure grammar', 'CONTESTED (FC-A5 instrument drift) — 10 binding rules applied app-wide; not a screen of its own'],
    ['F4 states S3-S19', 'SHIP — 19-state grammar (stalled/paused/interrupted/disk-full/metered/queued…) beyond the happy-path rail'],
    ['F5 verification states', 'RETIRED as a surface — grammar renders on the F4 rail (mismatch / check-failed built into copy register)'],
    ['H-APP-1/2/3/5 seam', 'Deep-link receive, found-files card, byte-parity, carry-over promise — coupled to PR-1..PR-10'],
  ]
  const outOfV1 = [
    'Cloud-provider integrations (OpenAI/Anthropic keys)',
    'Agent / cowork mode',
    'MCP servers UI',
    'Local API server (no listening sockets in v1)',
    'Custom-model (AddModel) dialog',
    'Interface/appearance + language settings (follow the system)',
    'Startup behavior · download concurrency tuning',
    'Enterprise MDM config (v2 backlog)',
    'Crash reporter (founder call O-F7)',
    'MLX in the novice UI (until Rust verification extends to the MLX path)',
  ]
  return (
    <div>
      <h1 className="hb-title">Roadmap &amp; backlog</h1>
      <p className="hb-body hb-secondary">
        This foundation lane ships the critical path (F1-F4, F6, F7) in the Hugging Bay grammar.
        Everything below is documented, not hidden.
      </p>

      <h2 className="hb-section-title">Remaining v1 flows (stubbed)</h2>
      <ul className="hb-stub-list">
        {v1Remaining.map(([k, v]) => (
          <li key={k}>
            <strong>{k}</strong>
            <span className="hb-caption" style={{ textAlign: 'right', maxWidth: 420 }}>
              {v}
            </span>
          </li>
        ))}
      </ul>

      <h2 className="hb-section-title">Explicitly out of v1</h2>
      <ul className="hb-stub-list">
        {outOfV1.map((k) => (
          <li key={k}>
            <span>{k}</span>
            <span className="hb-badge">out of v1</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
