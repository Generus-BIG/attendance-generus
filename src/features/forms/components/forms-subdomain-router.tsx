import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom'
import {
  FormsLandingFallback,
  PublicFormPage,
} from '@/features/forms/components/public-form-page'

function PublicFormRoute() {
  const { slug } = useParams<{ slug: string }>()

  if (!slug) return <FormsLandingFallback />

  return <PublicFormPage slug={slug} />
}

export function FormsSubdomainRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<FormsLandingFallback />} />
        <Route path='/:slug' element={<PublicFormRoute />} />
        <Route path='*' element={<FormsLandingFallback />} />
      </Routes>
    </BrowserRouter>
  )
}
