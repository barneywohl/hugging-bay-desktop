/*
 * Pirate lint (DESIGN_TOKENS §7.7, founder law): the word "pirate" must never
 * appear in any product UI string. Scans the source that ships in the bundle.
 * Exit non-zero on any match.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const ROOT = new URL('../src', import.meta.url).pathname
const EXTS = new Set(['.ts', '.tsx', '.css', '.html'])
const NEEDLE = /pirate/i

function walk(dir) {
  let files = []
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) files = files.concat(walk(p))
    else if (EXTS.has(extname(p))) files.push(p)
  }
  return files
}

let hits = 0
for (const f of walk(ROOT)) {
  const lines = readFileSync(f, 'utf8').split('\n')
  lines.forEach((line, i) => {
    if (NEEDLE.test(line)) {
      hits++
      console.error(`PIRATE LINT FAIL: ${f}:${i + 1}: ${line.trim()}`)
    }
  })
}

if (hits > 0) {
  console.error(`\n✗ pirate lint failed — ${hits} occurrence(s). The word never ships in product UI.`)
  process.exit(1)
}
console.log('✓ pirate lint passed — the word "pirate" appears in no product UI string.')
