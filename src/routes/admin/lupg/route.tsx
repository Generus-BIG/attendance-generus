import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/lupg')({
  component: LupgLayout,
})

function LupgLayout() {
  return <Outlet />
}
