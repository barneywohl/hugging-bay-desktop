import { COPY } from '../../copy/strings'
import { useSettingsStore } from '../../stores'
import { ScreenShell } from '../../components/ScreenShell'

export function UpdatesScreen() {
  const observed = useSettingsStore((state) => state.value !== null)
  return <ScreenShell title={COPY.shell.updates} observed={observed} />
}
