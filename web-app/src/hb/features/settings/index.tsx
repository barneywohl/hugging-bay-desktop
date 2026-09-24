import { useContext, useEffect, useState } from 'react'
import { COPY } from '../../copy/strings'
import { SpineContext } from '../../spine-context'
import { useSettingsStore } from '../../stores'

// F10 — "The Short List". Jan's ~15-page settings tree is ripped down to four rows
// (F10 §5.10); advanced is re-homed behind the F10-7 disclosure. The one surface
// that must be exact is "What this app sends." (F10-5): it defaults to the CLOSED
// gate and states, verbatim, the only egress this build makes — update checks. No
// telemetry claim is softened and nothing here fabricates a setting the core did
// not confirm (settings read/write is the real settings_store round-trip).
export function SettingsScreen() {
  const spine = useContext(SpineContext)
  const settings = useSettingsStore((state) => state.value)
  const observed = settings !== null
  const [sendsOpen, setSendsOpen] = useState(false)

  useEffect(() => { void spine?.readSettings() }, [spine])

  return (
    <section className="hb-screen" data-core-observed={observed}>
      <h1>{COPY.shell.settings}</h1>

      <ul className="hb-short-list">
        <li>{COPY.f10.rows[0]}</li>
        <li>{COPY.f10.rows[1]}</li>
        <li>
          <button type="button" aria-expanded={sendsOpen} onClick={() => setSendsOpen((v) => !v)}>
            {COPY.f10.sends.titleClosed}
          </button>
          {sendsOpen && <p className="hb-quiet" role="region">{COPY.f10.sends.closed}</p>}
        </li>
        <li>{COPY.f10.rows[3]}</li>
      </ul>

      <div className="hb-about">
        <p>{COPY.f10.about.builtOn}</p>
        <p className="hb-quiet">{COPY.f10.about.fork}</p>
      </div>

      {/* F10-7 — advanced is present but re-homed, not on the short list. */}
      <details className="hb-advanced">
        <summary>{COPY.shell.advanced}</summary>
        <p className="hb-quiet">{COPY.shell.unavailable}</p>
      </details>
    </section>
  )
}
