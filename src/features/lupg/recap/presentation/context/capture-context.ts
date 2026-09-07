import { createContext, useContext } from 'react'

// Only the isolated export tree supplies this; the interactive player stays unchanged.
export const CaptureContext = createContext<{ view: 'data' | 'analysis' } | null>(null)
export const useCaptureMode = () => useContext(CaptureContext)
