import { VerifyScreen } from '../verify'
import { FitScreen } from '../fit'
import { COPY } from '../../copy/strings'
import { useFitStore } from '../../stores'
import { ScreenShell } from '../../components/ScreenShell'

export function ModelDetailScreen() {
  const observed = useFitStore((state) => state.value !== null)
  return <ScreenShell title={COPY.shell.modelDetail} observed={observed}>
    <FitScreen />
    <VerifyScreen />
  </ScreenShell>
}
