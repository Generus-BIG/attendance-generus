const MAIN_APP_HOST = 'generusbig.my.id'
const FORMS_HOST = 'forms.generusbig.my.id'

type UrlLocation = Pick<Location, 'hostname' | 'origin' | 'protocol'>

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

function getLocation() {
  return window.location
}

export function getPublicFormUrl(
  slug: string,
  location: UrlLocation = getLocation()
) {
  const encodedSlug = encodeURIComponent(slug)

  if (isLocalHostname(location.hostname)) {
    return `${location.origin}/forms/${encodedSlug}`
  }

  if (
    location.hostname === MAIN_APP_HOST ||
    location.hostname === FORMS_HOST ||
    location.hostname.endsWith(`.${MAIN_APP_HOST}`)
  ) {
    return `${location.protocol}//${FORMS_HOST}/${encodedSlug}`
  }

  return `${location.origin}/forms/${encodedSlug}`
}

export function getRegisterParticipantUrl(
  slug: string,
  location: UrlLocation = getLocation()
) {
  const path = `/register/add-participant?slug=${encodeURIComponent(slug)}`

  if (location.hostname === FORMS_HOST) {
    return `${location.protocol}//${MAIN_APP_HOST}${path}`
  }

  return `${location.origin}${path}`
}

export function formatPublicFormUrlLabel(url: string) {
  const parsedUrl = new URL(url)

  return `${parsedUrl.host}${parsedUrl.pathname}`
}
