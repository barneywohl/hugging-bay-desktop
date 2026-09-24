import { useEffect, useState, type ReactNode } from 'react'
import { connectMirrors } from './stores/synchronize'
import { useSettingsStore } from './stores'

import { SpineContext } from './spine-context'

// Lifecycle context only; domain truth lives in the six read-only mirror stores.
export function SpineProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<ReturnType<typeof connectMirrors> | null>(null)
  const theme = useSettingsStore((state) => state.value?.appearance.theme)
  useEffect(() => {
    const session = connectMirrors()
    setConnection(session)
    return () => session.stop()
  }, [])
  useEffect(() => {
    if (theme && theme !== 'system') document.documentElement.dataset.theme = theme
    else delete document.documentElement.dataset.theme
  }, [theme])
  return <SpineContext.Provider value={connection}>{children}</SpineContext.Provider>
}
