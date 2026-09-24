import { COPY } from '../../copy/strings'
import { useEngineStore } from '../../stores'
import { ScreenShell } from '../../components/ScreenShell'

export function EngineScreen() {
  const observed = useEngineStore((state) => state.value !== null)
  return <ScreenShell title={COPY.shell.engine} observed={observed} />
}
