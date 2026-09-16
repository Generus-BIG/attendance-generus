export function getToolResultState(
  status: { type: string; reason?: string },
  result: unknown,
  isError?: boolean
): 'running' | 'complete' | 'query-error' | 'cancelled' {
  if (isError || status.type === 'incomplete')
    return status.reason === 'cancelled' ? 'cancelled' : 'query-error'
  // assistant-ui may settle the message before the matching streamed output.
  if (result === undefined) return 'running'
  return 'complete'
}
