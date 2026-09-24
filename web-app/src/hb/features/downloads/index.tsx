import { VerifyScreen } from '../verify'
import { COPY } from '../../copy/strings'
import { useDownloadStore } from '../../stores'
import { ScreenShell } from '../../components/ScreenShell'

export function DownloadsScreen() {
  const observed = useDownloadStore((state) => state.value !== null)
  return <ScreenShell title={COPY.shell.downloads} observed={observed}>
    <VerifyScreen />
  </ScreenShell>
}
