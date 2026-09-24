import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { COPY } from './hb/copy/strings'
import { routeTree } from './routeTree.gen'
import './hb/tokens.css'
import './hb/shell.css'

document.title = COPY.shell.app
const router = createRouter({ routeTree })
declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}
// No legacy provider bootstrap, updater, catalog request, analytics or cloud
// service hydration. HB's session provider owns the typed mirror subscription.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode><RouterProvider router={router} /></StrictMode>
)
