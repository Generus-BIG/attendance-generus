import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({
      to: '/admin/dashboard',
      search: { tab: 'desa', month: new Date().toLocaleDateString('sv').slice(0, 7) },
    })
  },
})
