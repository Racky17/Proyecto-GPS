/**
 * Application Routes Configuration
 *
 * Defines all protected routes in the application using React lazy loading
 * for code splitting and performance optimization.
 *
 * Each route object contains:
 * - path: URL path for the route
 * - name: Human-readable name for breadcrumbs
 * - element: Lazy-loaded React component
 * - exact: (optional) Requires exact path match
 *
 * @module routes
 */

import React from 'react'

const Home = React.lazy(() => import('./views/pages/home/Home'))
const Options = React.lazy(() => import('./views/pages/options/Options'))
const GestorDocumentos = React.lazy(() => import('./views/pages/documentos/GestorDocumentos'))

export const routes = [
  { path: '/', exact: true, name: 'Home', element: Home },
  { path: '/options', exact: true, name: 'Options', element: Options },
  { path: '/documentos', name: 'Gestión Documental', element: GestorDocumentos },
]
export default routes
