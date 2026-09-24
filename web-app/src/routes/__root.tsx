import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { SpineProvider } from '@/hb/SpineProvider'
import { COPY } from '@/hb/copy/strings'

export const Route = createRootRoute({
  component: RootLayout,
  errorComponent: () => <p role="alert">{COPY.shell.error}</p>,
  notFoundComponent: () => <p role="status">{COPY.shell.notFound}</p>,
})
function RootLayout() {
  return (
    <SpineProvider>
      <div className="hb-app">
        <header className="hb-titlebar" data-tauri-drag-region>{COPY.shell.app}</header>
        <nav aria-label={COPY.shell.navigation}>
          <Link to="/">{COPY.shell.firstRun}</Link>
          <Link to="/discover">{COPY.shell.discover}</Link>
          <Link to="/downloads">{COPY.shell.downloads}</Link>
          <Link to="/chat">{COPY.shell.chat}</Link>
          <Link to="/library">{COPY.shell.library}</Link>
          <Link to="/settings">{COPY.shell.settings}</Link>
        </nav>
        <main><Outlet /></main>
      </div>
    </SpineProvider>
  )
}
