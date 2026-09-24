import { createContext } from 'react'
import type { connectMirrors } from './stores/synchronize'
export const SpineContext = createContext<ReturnType<typeof connectMirrors> | null>(null)
