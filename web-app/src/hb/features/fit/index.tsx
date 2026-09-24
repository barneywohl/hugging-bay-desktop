import { COPY } from '../../copy/strings'
import { useFitStore } from '../../stores'
import { ScreenShell } from '../../components/ScreenShell'

export function FitScreen() {
  const observed = useFitStore((state) => state.value !== null)
  return <ScreenShell title={COPY.shell.fit} observed={observed} />
}
