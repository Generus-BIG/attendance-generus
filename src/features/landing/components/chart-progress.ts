export function chartProgress(top: number, viewportHeight: number) {
  return Math.min(
    1,
    Math.max(0, (viewportHeight * 0.8 - top) / (viewportHeight * 0.6))
  )
}

export function demoRows(
  data: readonly { label: string; value: number }[],
  progress: number
) {
  const amount = Math.min(1, Math.max(0, progress))
  return data.map((row) => ({ ...row, value: Math.round(row.value * amount) }))
}
