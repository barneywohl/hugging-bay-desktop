import { COPY } from '../../copy/strings'
import type { HbError } from '../../ipc'

// Lane 5 owns the full F12 grammar. Raw native messages are never rendered.
export function FailureShell({ error }: { error: HbError }) {
  return <p role="alert" data-error-code={error.code}>{COPY.shell.error}</p>
}
