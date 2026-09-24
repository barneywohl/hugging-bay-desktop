import { COPY } from '../../copy/strings'
import { useLibraryStore } from '../../stores'
import { ScreenShell } from '../../components/ScreenShell'

export function LibraryScreen() {
  const observed = useLibraryStore((state) => state.value !== null)
  return <ScreenShell title={COPY.shell.library} observed={observed} />
}
