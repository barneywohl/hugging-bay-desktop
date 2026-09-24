import type { ReactNode } from 'react'
import { COPY } from '../copy/strings'

export function ScreenShell({ title, observed, children }: {
  title: string; observed: boolean; children?: ReactNode
}) {
  return (
    <section className="hb-screen" data-core-observed={observed}>
      <h1>{title}</h1>
      <p role="status">{COPY.shell.unavailable}</p>
      {children}
    </section>
  )
}
