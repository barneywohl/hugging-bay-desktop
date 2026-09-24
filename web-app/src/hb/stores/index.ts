// Screens get selectors only, never setState/receive. Mutation sinks are confined
// to synchronize.ts and tests by the hb/mirror-boundary ESLint gate.
import { downloadMirror } from './download'
import { verifyMirror } from './verify'
import { engineMirror } from './engine'
import { fitMirror } from './fit'
import { libraryMirror } from './library'
import { settingsMirror } from './settings'
export const useDownloadStore = downloadMirror.useMirror
export const useVerifyStore = verifyMirror.useMirror
export const useEngineStore = engineMirror.useMirror
export const useFitStore = fitMirror.useMirror
export const useLibraryStore = libraryMirror.useMirror
export const useSettingsStore = settingsMirror.useMirror
export { selectDownloadState } from './download'
export { selectChecked } from './verify'
export { selectRunningModel } from './engine'
