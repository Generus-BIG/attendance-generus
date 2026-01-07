import { createFileRoute } from '@tanstack/react-router'
import { CreateFormPage } from '@/features/forms/components/create-form-page'

export const Route = createFileRoute('/admin/forms/create')({
  component: CreateFormPage,
})
