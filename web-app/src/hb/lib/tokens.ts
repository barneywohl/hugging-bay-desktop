// Non-copy string constants used by feature files. These are machine tokens
// (download provenance tags, an empty-string seed), NOT product copy, so they
// live outside the verbatim-copy-linted graph (src/hb/features|components|routes)
// while feature files reference them as identifiers rather than raw literals.

export const DownloadSource = {
  catalog: 'catalog',
  modelDetail: 'model-detail',
  library: 'library',
  update: 'update',
} as const

export const EMPTY = ''
