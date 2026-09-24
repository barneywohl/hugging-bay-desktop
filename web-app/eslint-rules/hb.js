// HB renderer law gates. Legacy Jan source is still linted by the default
// configuration; lint:hb is the required gate for the mounted HB entry graph.
const definition = (description, create) => ({
  meta: { type: 'problem', docs: { description }, schema: [], messages: { violation: description } }, create,
})
const report = (context, node) => context.report({ node, messageId: 'violation' })
const imported = (node) => node.type === 'ImportDeclaration' || node.type.startsWith('Export') || node.type === 'ImportExpression'

export default {
  rules: {
    'no-invoke-string-literals': definition('Use the typed hb/ipc client; raw Tauri invoke/event APIs are confined to hb/ipc.', (context) => ({
      ImportDeclaration(node) {
        if (/^@tauri-apps\/(api\/(core|event)|plugin-)/.test(node.source.value)) report(context, node)
      },
      ImportExpression(node) {
        if (typeof node.source.value === 'string' && /^@tauri-apps\//.test(node.source.value)) report(context, node)
      },
      CallExpression(node) {
        const callee = node.callee
        if ((callee.type === 'Identifier' && callee.name === 'invoke') ||
          (callee.type === 'MemberExpression' && (callee.property.name ?? callee.property.value) === 'invoke')) report(context, node)
      },
      MemberExpression(node) {
        if (['__TAURI__', '__TAURI_INTERNALS__'].includes(node.property.name ?? node.property.value)) report(context, node)
      },
    })),
    'verbatim-copy': definition('Render copy from hb/copy/strings.ts verbatim. Inline text, labels and paraphrases are forbidden.', (context) => {
      function allowed(node) {
        const parent = node.parent
        if (imported(parent) || parent.type.startsWith('TS')) return true
        if (parent.type === 'JSXAttribute') {
          return /^(className|id|type|role|to|key|data-[a-z-]+|aria-live|aria-current)$/.test(parent.name.name)
        }
        if (parent.type === 'BinaryExpression') return true // machine state comparison, not copy
        if (typeof node.value === 'string' && node.value.startsWith('/')) return true // route identity
        return false
      }
      return {
        JSXText(node) { if (node.value.trim()) report(context, node) },
        Literal(node) { if (typeof node.value === 'string' && !allowed(node)) report(context, node) },
        TemplateLiteral(node) { if (!node.parent.type.startsWith('TS')) report(context, node) },
      }
    }),
    'mirror-boundary': definition('HB features may read stores/index only; mutation sinks and raw transport factories belong to the spine.', (context) => ({
      ImportDeclaration(node) {
        const source = node.source.value
        if (/stores\/(?!index(?:\.|$))/.test(source) || /ipc\/(client|contracts|schemas)/.test(source) ||
          /(?:zustand|services\/|backendStorage|useDownloadStore|useAppState|useAnalytic)/.test(source)) report(context, node)
      },
      NewExpression(node) {
        if (['XMLHttpRequest', 'WebSocket', 'EventSource'].includes(node.callee.name)) report(context, node)
      },
      CallExpression(node) {
        const name = node.callee.property?.name ?? node.callee.name
        if (['setState', 'persist', 'createJSONStorage', 'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'setInterval'].includes(name)) report(context, node)
      },
    })),
    'no-mirror-persistence': definition('Mirror stores cannot persist or fabricate durable state; only synchronization receives core observations.', (context) => ({
      ImportDeclaration(node) { if (/zustand\/middleware|backendStorage/.test(node.source.value)) report(context, node) },
      Identifier(node) { if (['localStorage', 'sessionStorage', 'indexedDB'].includes(node.name)) report(context, node) },
    })),
  },
}
