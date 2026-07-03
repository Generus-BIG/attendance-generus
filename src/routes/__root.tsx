import { lazy, Suspense } from 'react'
import { type QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  Outlet,
  useRouterState,
} from '@tanstack/react-router'
import { Toaster } from '@/components/ui/sonner'
import { NavigationProgress } from '@/components/navigation-progress'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'

const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then(({ ReactQueryDevtools }) => ({
    default: ReactQueryDevtools,
  }))
)
const TanStackRouterDevtools = lazy(() =>
  import('@tanstack/react-router-devtools').then(
    ({ TanStackRouterDevtools }) => ({ default: TanStackRouterDevtools })
  )
)

function RootComponent() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const showDevtools =
    import.meta.env.MODE === 'development' &&
    !pathname.startsWith('/share/dashboard/')

  return (
    <>
      <NavigationProgress />
      <Outlet />
      <Toaster duration={5000} />
      {showDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtools buttonPosition='bottom-left' />
          <TanStackRouterDevtools position='bottom-right' />
        </Suspense>
      )}
    </>
  )
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})
