import { useMemo } from 'react'
import { useFitStore } from '../stores'
import { computeFit, type FitInput } from './fitObject'
import type { FitObject } from '../ipc'

// The single renderer hook onto the fit object. Reads the probed hardware from
// the fit mirror (populated only by a real machine.probe / plugin:hardware read)
// and runs the one constructor. Screens call this — they never do fit math.
export function useFitObject(
  file: FitInput['file'] | null | undefined,
  siblings?: FitInput['siblings']
): FitObject | null {
  const hardware = useFitStore((state) => state.value?.rawHardware ?? null)
  return useMemo(() => (file ? computeFit({ hardware, file, siblings }) : null), [hardware, file, siblings])
}

// True once a real probe has landed (rawHardware present). Machine-unknown until.
export function useMachineKnown(): boolean {
  return useFitStore((state) => (state.value?.rawHardware ?? null) != null)
}
