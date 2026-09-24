import { COPY } from '../../copy/strings'
import { useSettingsStore } from '../../stores'
import { ScreenShell } from '../../components/ScreenShell'

export function SettingsScreen() {
  const observed = useSettingsStore((state) => state.value !== null)
  return (
    <ScreenShell title={COPY.shell.settings} observed={observed}>
      <ul className="hb-settings">
        {COPY.f10.rows.map((label) => <li key={label}><button type="button" disabled>{label}</button></li>)}
      </ul>
      <details><summary>{COPY.shell.advanced}</summary><p>{COPY.shell.unavailable}</p></details>
    </ScreenShell>
  )
}
