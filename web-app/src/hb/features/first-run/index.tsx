import { useContext, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { COPY, FIT } from '../../copy/strings'
import { SpineContext } from '../../spine-context'
import { useFitStore } from '../../stores'

// F1 — "The Quiet Minute". Wired to the REAL probe (plugin:hardware via the fit
// mirror), replacing hb-app's fake MACHINE. The narrated multi-line check stays
// HELD-conditional; we ship the settled M1 beat: welcome → checking → checked.
// "checked" renders ONLY once a real hardware read has landed in the mirror.
export function FirstRunScreen() {
  const spine = useContext(SpineContext)
  const navigate = useNavigate()
  const hardware = useFitStore((state) => state.value?.rawHardware ?? null)
  const error = useFitStore((state) => state.error)
  // Phase is derived, not stored as a copy-shaped token: not started → welcome;
  // started with nothing landed → checking; a landed read/err → checked.
  const [started, setStarted] = useState(false)
  const settled = hardware != null || error != null

  async function check() {
    setStarted(true)
    await spine?.probeHardware()
  }

  if (!started) {
    return (
      <section className="hb-screen" data-phase="welcome">
        <h1>{COPY.f1.s1.welcome}</h1>
        <p>{COPY.f1.s1.tagline}</p>
        <p>{COPY.f1.s1.body}</p>
        <button type="button" onClick={() => void check()} disabled={!spine}>
          {COPY.f1.s1.primary}
        </button>
        <p className="hb-quiet">{COPY.f1.s1.quiet}</p>
      </section>
    )
  }

  if (!settled) {
    return (
      <section className="hb-screen" data-phase="checking" aria-live="polite">
        <h1>{COPY.f1.s2.checking}</h1>
        <p>{COPY.f1.s2.soWeOnly}</p>
        <p>{COPY.f1.s2.takesSeconds}</p>
      </section>
    )
  }

  // Settled/checked. A real read landed (or the probe honestly failed).
  return (
    <section className="hb-screen" data-phase="checked" data-observed={hardware != null}>
      <h1>{COPY.f1.s3.headline}</h1>
      <p>{COPY.f1.s3.memory}</p>
      {hardware && <output data-testid="hb-chip">{hardware.cpu.name}</output>}
      {error && <p role="alert">{FIT.unknown}</p>}
      <button type="button" onClick={() => void navigate({ to: '/discover' })}>
        {COPY.f1.s3.primary}
      </button>
    </section>
  )
}
