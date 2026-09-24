import { FitScreen } from '../fit'
import { COPY } from '../../copy/strings'
import { useFitStore } from '../../stores'
import { ScreenShell } from '../../components/ScreenShell'

export function DiscoverScreen() {
  const observed = useFitStore((state) => state.value !== null)
  return <ScreenShell title={COPY.shell.discover} observed={observed}>
    <FitScreen />
  </ScreenShell>
}
