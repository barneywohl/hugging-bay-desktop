import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { HbError } from '../ipc'

export interface Mirror<T> { value: T | null; error: HbError | null }
// No persist middleware, localStorage, timers, IPC, optimistic setters or mock
// defaults. Export the read-only facade to screens; sinks stay in synchronization.
export function createMirror<T>() {
  const store = createStore<Mirror<T>>(() => ({ value: null, error: null }))
  return {
    useMirror: <U,>(select: (state: Mirror<T>) => U) => useStore(store, select),
    getSnapshot: store.getState,
    receive: (value: T) => store.setState({ value, error: null }),
    reject: (error: HbError) => store.setState({ value: null, error }),
    reset: () => store.setState({ value: null, error: null }),
  }
}
