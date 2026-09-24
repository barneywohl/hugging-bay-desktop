import { EngineScreen } from '../engine'
import { COPY } from '../../copy/strings'
import { useEngineStore } from '../../stores'
import { ScreenShell } from '../../components/ScreenShell'

export function ChatScreen() {
  const observed = useEngineStore((state) => state.value !== null)
  return <ScreenShell title={COPY.shell.chat} observed={observed}>
    <EngineScreen />
  </ScreenShell>
}
