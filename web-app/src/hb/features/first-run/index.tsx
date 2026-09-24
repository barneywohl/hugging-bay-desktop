import { useContext } from 'react'
import { COPY } from '../../copy/strings'
import { SpineContext } from '../../spine-context'
import { useFitStore } from '../../stores'
import { ScreenShell } from '../../components/ScreenShell'

export function FirstRunScreen() {
  const spine = useContext(SpineContext)
  const hardware = useFitStore((state) => state.value?.rawHardware)
  return (
    <ScreenShell title={COPY.f1.s1.welcome} observed={hardware != null}>
      <button type="button" onClick={() => void spine?.probeHardware()} disabled={!spine}>
        {COPY.f1.s1.primary}
      </button>
      {hardware && <output>{hardware.cpu.name}</output>}
    </ScreenShell>
  )
}
