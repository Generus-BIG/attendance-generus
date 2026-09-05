const INTERACTIVE_TARGETS =
  'button, a, input, select, textarea, label, summary, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="slider"], [role="spinbutton"], [role="dialog"], [role="menu"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="listbox"], [role="option"], [role="combobox"], [role="tree"], [role="treeitem"], [data-radix-popper-content-wrapper], [data-presentation-no-navigation], .recharts-wrapper'

export function isNavigationExcluded(
  target: EventTarget | null,
  boundary: HTMLElement
): boolean {
  return (
    !(target instanceof Element) ||
    !boundary.contains(target) ||
    Boolean(target.closest(INTERACTIVE_TARGETS))
  )
}

export function getSwipeNavigationDirection(
  startX: number,
  endX: number,
  startY: number,
  endY: number,
  index: number,
  count: number
): -1 | 0 | 1 {
  const deltaX = endX - startX
  const direction = deltaX < 0 ? 1 : -1
  if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(endY - startY))
    return 0
  return index + direction < 0 || index + direction >= count ? 0 : direction
}

export function getMouseNavigationDirection(
  isFullscreen: boolean,
  clientX: number,
  bounds: Pick<DOMRect, 'left' | 'width'>,
  index: number,
  count: number
): -1 | 0 | 1 {
  return isFullscreen
    ? getSlideNavigationDirection(clientX, bounds, index, count)
    : 0
}

export function getSlideNavigationDirection(
  clientX: number,
  bounds: Pick<DOMRect, 'left' | 'width'>,
  index: number,
  count: number
): -1 | 0 | 1 {
  if (
    bounds.width <= 0 ||
    clientX < bounds.left ||
    clientX > bounds.left + bounds.width ||
    count < 2
  )
    return 0
  const direction = clientX < bounds.left + bounds.width / 2 ? -1 : 1
  return index + direction < 0 || index + direction >= count ? 0 : direction
}
