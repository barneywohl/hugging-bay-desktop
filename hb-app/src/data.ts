/* Sample catalog + machine profile for the foundation prototype. In the real
 * app these come from core/hb/catalog (main) and the on-device probe (F11). */

export type Fit = 'runs' | 'toobig' | 'unknown'

export interface Model {
  id: string
  name: string
  purposeLabel: string
  purpose: string
  sizeGB: number
  needGB: number
  fileId: string
  fingerprintShort: string
}

export const MACHINE = { haveGB: 8, chipLabel: 'Apple M-series', machineLabel: 'this Mac' }

export function fitFor(m: Model): Fit {
  // Single fit-object rule (mirrors web-app/src/hb/fit): argmax needGB <= haveGB fits.
  if (m.needGB <= MACHINE.haveGB) return 'runs'
  return 'toobig'
}

export const MODELS: Model[] = [
  {
    id: 'harbor-chat-3b',
    name: 'Harbor Chat 3B',
    purposeLabel: 'Like ChatGPT — but it runs on your own computer',
    purpose: 'Chat with it — ask questions, get explanations, draft anything.',
    sizeGB: 1.8,
    needGB: 3,
    fileId: 'harbor-chat-3b-q4.gguf',
    fingerprintShort: '9f3a…42cd',
  },
  {
    id: 'llama-3-8b',
    name: 'Llama 3 8B',
    purposeLabel: 'Like ChatGPT — but it runs on your own computer',
    purpose: 'Chat with it — ask questions, get explanations, draft anything.',
    sizeGB: 4.2,
    needGB: 6,
    fileId: 'llama-3-8b-q4.gguf',
    fingerprintShort: 'b1c7…09fe',
  },
  {
    id: 'qwen-3-4b',
    name: 'Qwen 3 4B',
    purposeLabel: 'Like ChatGPT — but it runs on your own computer',
    purpose: 'Chat with it — ask questions, get explanations, draft anything.',
    sizeGB: 2.4,
    needGB: 4,
    fileId: 'qwen-3-4b-q4.gguf',
    fingerprintShort: '3d5e…7a10',
  },
  {
    id: 'mixtral-8x7b',
    name: 'Mixtral 8x7B',
    purposeLabel: 'Like ChatGPT — but it runs on your own computer',
    purpose: 'Chat with it — ask questions, get explanations, draft anything.',
    sizeGB: 26,
    needGB: 32,
    fileId: 'mixtral-8x7b-q4.gguf',
    fingerprintShort: 'a0b2…ccd4',
  },
]

export function gb(n: number): string {
  return `${n} GB`
}
