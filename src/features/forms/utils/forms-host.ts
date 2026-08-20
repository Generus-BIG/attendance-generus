export function isFormsSubdomain(hostname = window.location.hostname) {
  return hostname.startsWith('forms.')
}

export function shouldRenderFormsSubdomainRouter() {
  return (
    import.meta.env.VITE_FORCE_FORMS_SUBDOMAIN === 'true' || isFormsSubdomain()
  )
}
