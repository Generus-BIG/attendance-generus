/* eslint-disable no-control-regex */
// XML 1.0 Section 2.2 disallows control characters in the ranges
// [#x0-#x8], [#xB-#xC], [#xE-#x1F], [#xD800-#xDFFF], [#xFFFE-#xFFFF].
// html-to-image uses XMLSerializer + SVG <foreignObject>, which fails with
// an XML parser error in modern browsers if any disallowed character is present.

export const XML_DISALLOWED_REGEX =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g

export function sanitizeXmlString(str: string): string {
  if (!str) return str
  return str.replace(XML_DISALLOWED_REGEX, (ch) =>
    ch === '\u000b' || ch === '\u000c' ? ' ' : ''
  )
}

export function sanitizePresentationData<T>(val: T): T {
  if (typeof val === 'string') {
    return sanitizeXmlString(val) as unknown as T
  }
  if (Array.isArray(val)) {
    return val.map((item) => sanitizePresentationData(item)) as unknown as T
  }
  if (
    val &&
    typeof val === 'object' &&
    (typeof Element === 'undefined' || !(val instanceof Element)) &&
    (typeof Blob === 'undefined' || !(val instanceof Blob))
  ) {
    const res: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(val)) {
      res[k] = sanitizePresentationData(v)
    }
    return res as unknown as T
  }
  return val
}

export function sanitizeDomForXml(root: Node): void {
  const doc = root.ownerDocument || document
  const walker = doc.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT
  )
  let current: Node | null = walker.currentNode
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      if (current.nodeValue && XML_DISALLOWED_REGEX.test(current.nodeValue)) {
        current.nodeValue = sanitizeXmlString(current.nodeValue)
      }
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as Element
      const attrs = el.attributes
      for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i]
        if (attr.value && XML_DISALLOWED_REGEX.test(attr.value)) {
          attr.value = sanitizeXmlString(attr.value)
        }
      }
    }
    current = walker.nextNode()
  }
}
