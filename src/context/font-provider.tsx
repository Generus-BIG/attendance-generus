import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { fonts } from '@/config/fonts'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

type Font = (typeof fonts)[number]

const FONT_COOKIE_NAME = 'font'
const FONT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year
const DEFAULT_FONT: Font = 'manrope'

type FontContextType = {
  font: Font
  setFont: (font: Font) => void
  resetFont: () => void
}

const FontContext = createContext<FontContextType | null>(null)

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [font, _setFont] = useState<Font>(() => {
    const savedFont = getCookie(FONT_COOKIE_NAME)
    return fonts.includes(savedFont as Font)
      ? (savedFont as Font)
      : DEFAULT_FONT
  })

  useEffect(() => {
    const applyFont = (font: string) => {
      const root = document.documentElement
      root.classList.forEach((cls) => {
        if (cls.startsWith('font-')) root.classList.remove(cls)
      })
      root.classList.add(`font-${font}`)
    }

    applyFont(font)
  }, [font])

  const contextValue = useMemo(
    () => ({
      font,
      setFont: (nextFont: Font) => {
        setCookie(FONT_COOKIE_NAME, nextFont, FONT_COOKIE_MAX_AGE)
        _setFont(nextFont)
      },
      resetFont: () => {
        removeCookie(FONT_COOKIE_NAME)
        _setFont(DEFAULT_FONT)
      },
    }),
    [font]
  )

  return (
    <FontContext value={contextValue}>{children}</FontContext>
  )
}

export const useFont = () => {
  const context = useContext(FontContext)
  if (!context) {
    throw new Error('useFont must be used within a FontProvider')
  }
  return context
}
