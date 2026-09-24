import { ESLint } from 'eslint'
import type { Plugin } from 'vite'
import path from 'node:path'

// Check every source module reachable from the shipped entry, including retained
// Jan code if a future feature imports it. lint:hb alone cannot see that closure.
export function hbEntryGate(): Plugin {
  return {
    name: 'hb-entry-boundary-gate',
    apply: 'build',
    async generateBundle() {
      const sourceRoot = path.resolve('src') + path.sep
      const files = [...this.getModuleIds()].filter((id) => id.startsWith(sourceRoot) && /\.[cm]?tsx?$/.test(id))
      const eslint = new ESLint()
      const results = await eslint.lintFiles(files)
      const errors = results.reduce((sum, result) => sum + result.errorCount, 0)
      if (errors) {
        const formatter = await eslint.loadFormatter('stylish')
        this.error(`HB entry boundary failed (${errors} errors):\n${formatter.format(results)}`)
      }
      this.emitFile({
        type: 'asset', fileName: 'hb-renderer-audit.json',
        source: JSON.stringify({
          scope: 'renderer source import closure only; not a native egress audit',
          nativeEgressAuditVerified: false,
          sourceModules: files.map((file) => path.relative(process.cwd(), file)).sort(),
          lintErrors: errors,
        }, null, 2),
      })
    },
  }
}
