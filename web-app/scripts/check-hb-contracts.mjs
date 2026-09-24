import { readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
const root = fileURLToPath(new URL('../', import.meta.url))
const copyPath = `${root}src/hb/copy/strings.ts`
const source = readFileSync(copyPath, 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { COPY } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const manifest = JSON.parse(readFileSync(`${root}src/hb/copy/locks.json`, 'utf8'))
const errors = []
for (const [path, lock] of Object.entries(manifest.locks)) {
  let value = path.split('.').reduce((value, key) => value[key], COPY)
  if (typeof value === 'function') value = value(...lock.bindings)
  const hash = createHash('sha256').update(value).digest('hex')
  if (hash !== lock.sha256) errors.push(`Copy lock ${lock.id} drifted: COPY.${path}`)
}
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`])
}
for (const path of files(`${root}src/hb`)) {
  if (path.endsWith('tokens.css') || path.includes('/__tests__/')) continue
  if (/\.(css|tsx?)$/.test(path) && /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch)\(/i.test(readFileSync(path, 'utf8'))) {
    errors.push(`Use tokens.css colors: ${path}`)
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1 }
else console.log(`HB copy locks: ${Object.keys(manifest.locks).length} passed; token-source gate passed.`)
