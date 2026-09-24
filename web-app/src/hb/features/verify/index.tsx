import { COPY } from '../../copy/strings'
import { useVerifyStore } from '../../stores'
import { ScreenShell } from '../../components/ScreenShell'

export function VerifyScreen() {
  const observed = useVerifyStore((state) => state.value !== null)
  return <ScreenShell title={COPY.shell.verify} observed={observed} />
}
