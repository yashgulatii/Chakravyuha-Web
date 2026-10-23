import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { SiteLayout } from './components/Site'

const Home = lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })))
const RingPage = lazy(() =>
  import('./pages/RingPage').then((module) => ({ default: module.RingPage })),
)
const Ledger = lazy(() =>
  import('./pages/Ledger').then((module) => ({ default: module.Ledger })),
)
const Architecture = lazy(() =>
  import('./pages/Architecture').then((module) => ({ default: module.Architecture })),
)
const Scope = lazy(() => import('./pages/Scope').then((module) => ({ default: module.Scope })))
const NotFound = lazy(() =>
  import('./pages/NotFound').then((module) => ({ default: module.NotFound })),
)

function RouteView() {
  const location = useLocation()
  return (
    <Suspense fallback={<main id="main-content" className="page-main route-loading">Loading…</main>}>
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/ring/:n" element={<RingPage />} />
        <Route path="/ledger" element={<Ledger />} />
        <Route path="/architecture" element={<Architecture />} />
        <Route path="/scope" element={<Scope />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <SiteLayout>
          <RouteView />
        </SiteLayout>
      </BrowserRouter>
    </HelmetProvider>
  )
}

export default App
