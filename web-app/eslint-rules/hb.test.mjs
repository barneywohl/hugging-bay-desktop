import { RuleTester } from 'eslint'
import hb from './hb.js'
const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } } })
tester.run('no-invoke-string-literals', hb.rules['no-invoke-string-literals'], {
  valid: ["ipc.engine.load({modelId: 'm', fileId: 'f'})"],
  invalid: [
    { code: "invoke('load_model')", errors: 1 },
    { code: "import {invoke as call} from '@tauri-apps/api/core'; call('load_model')", errors: 1 },
    { code: "import * as tauri from '@tauri-apps/api/core'; tauri.invoke('x')", errors: 2 },
    { code: "import('@tauri-apps/api/event')", errors: 1 },
    { code: "window.__TAURI_INTERNALS__.invoke('x')", errors: 2 },
  ],
})
tester.run('verbatim-copy', hb.rules['verbatim-copy'], {
  valid: ["import {COPY} from '../copy/strings'; const node = <button type='button'>{COPY.f4.start}</button>"],
  invalid: [
    { code: '<p>Checked and safe.</p>', errors: 1 },
    { code: "const label = 'Ready'; const node = <p>{label}</p>", errors: 1 },
    { code: 'const node = <button aria-label="Start chatting now"/>', errors: 1 },
    { code: 'const node = <p>{`Ready ${name}`}</p>', errors: 1 },
    { code: "const node = <p>{'Start chatting'}</p>", errors: 1 },
  ],
})
tester.run('mirror-boundary', hb.rules['mirror-boundary'], {
  valid: ["import {useEngineStore} from '../../stores'"],
  invalid: [
    { code: "import {engineMirror} from '../../stores/engine'", errors: 1 },
    { code: "store.setState({ready:true})", errors: 1 },
    { code: "import {createClient} from '../../ipc/client'", errors: 1 },
    { code: "fetch('https://example.com')", errors: 1 },
  ],
})
