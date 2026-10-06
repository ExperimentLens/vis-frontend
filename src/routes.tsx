import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import ProgressPage from './app/ProgressPage/progress-page';
import ProgressPageLoading from './app/ProgressPage/progress-page-loading';
import ErrorPage from './error-page';
import NotFound from './not-found';
import ProtectedRoute from './protected-route';
import TokenAuthHandler from './token-auth-handler';
import Loader from './shared/components/loader';

// Each page is its own chunk, so opening one experiment view doesn't download all the others.
const LoginPage = lazy(() => import('./app/LoginPage/login-page'));
const ExperimentsLandingPage = lazy(() => import('./app/ProgressPage/ExperimentsLandingPage/experiments-landing-page'));
const MonitoringPage = lazy(() => import('./app/ProgressPage/MonitoringPage/monitoring-page'));
const WorkflowTab = lazy(() => import('./app/ProgressPage/WorkflowTab/workflow-tab'));
const HighlightsPage = lazy(() => import('./app/ProgressPage/HighlightsPage/highlights-page'));

/**
 * Deployments behind the ABAC/Keycloak proxy set VITE_REQUIRE_AUTH=true to send
 * signed-out users to /login. Off by default so a local stack works without a login.
 */
const REQUIRE_AUTH = import.meta.env.VITE_REQUIRE_AUTH === 'true';

const guard = (node: ReactNode) => (REQUIRE_AUTH ? <ProtectedRoute>{node}</ProtectedRoute> : node);

const lazyPage = (node: ReactNode) => <Suspense fallback={<Loader />}>{node}</Suspense>;

/** A page inside the app shell (menu + top bar), which stays visible while the page loads. */
const inShell = (page: ReactNode) => guard(<ProgressPage>{lazyPage(page)}</ProgressPage>);

const routes = createBrowserRouter([
  {
    path: '/login',
    element: lazyPage(<LoginPage />),
    errorElement: <ErrorPage />,
  },
  {
    path: '/',
    element: inShell(<ExperimentsLandingPage />),
    errorElement: <ErrorPage />,
  },
  {
    path: '/:experimentId',
    element: guard(<ProgressPageLoading />),
    errorElement: <ErrorPage />,
  },
  {
    path: '/external/:token/:experimentId?',
    element: <TokenAuthHandler />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/:experimentId/monitoring',
    element: inShell(<MonitoringPage />),
    errorElement: <ErrorPage />,
  },
  {
    path: '/:experimentId/workflow',
    element: inShell(<WorkflowTab />),
    errorElement: <ErrorPage />,
  },
  {
    path: '/:experimentId/highlights',
    element: inShell(<HighlightsPage />),
    errorElement: <ErrorPage />,
  },
  {
    path: '*',
    element: <NotFound />,
    errorElement: <NotFound />,
  },
]);

export default routes;
