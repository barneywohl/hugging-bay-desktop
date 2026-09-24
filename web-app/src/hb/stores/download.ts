import type { EventName, EventPayload } from '../ipc'
import { createMirror } from './mirror'

type DownloadEvent = Extract<EventName, `download/${string}`>
export type DownloadObservation = { [K in DownloadEvent]?: EventPayload<K> }
export type DownloadMirror = Readonly<Record<string, DownloadObservation>>
export const downloadMirror = createMirror<DownloadMirror>()
export function receiveDownload<K extends DownloadEvent>(event: K, payload: EventPayload<K>) {
  const previous = downloadMirror.getSnapshot().value ?? {}
  downloadMirror.receive({ ...previous, [payload.taskId]: { ...previous[payload.taskId], [event]: payload } })
}
// No interpretation of percentages/completed as S17, ready, or CHECKED.
export const selectDownloadState = (task: DownloadObservation | undefined) => task?.['download/state']?.to ?? null
