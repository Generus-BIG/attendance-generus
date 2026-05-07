import { supabase } from '@/lib/supabase'

export const PALETTE_VALUES = [
  'modern-natural',
  'anthropic-claude',
  'sage-green',
] as const
export type PaletteValue = (typeof PALETTE_VALUES)[number]

export type DefaultPaletteSetting = {
  palette: PaletteValue
  updated_at: string
  updated_by: string | null
}

function isPaletteValue(v: unknown): v is PaletteValue {
  return (
    typeof v === 'string' &&
    (PALETTE_VALUES as readonly string[]).includes(v)
  )
}

/**
 * Fetch the current global default palette.
 * Returns `null` if the row is missing or unreadable (callers should fall back to client default).
 */
export async function getDefaultPalette(): Promise<DefaultPaletteSetting | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value, updated_at, updated_by')
    .eq('key', 'default_palette')
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const rawPalette = (data.value as { palette?: unknown })?.palette
  const palette: PaletteValue = isPaletteValue(rawPalette)
    ? rawPalette
    : 'modern-natural'

  return {
    palette,
    updated_at: data.updated_at,
    updated_by: data.updated_by,
  }
}

/**
 * Super-admin only. RLS enforces permission.
 * Bumping the row's updated_at forces all clients to pick up the change on next load.
 */
export async function setDefaultPalette(palette: PaletteValue): Promise<void> {
  const { error } = await supabase
    .from('app_settings')
    .upsert(
      {
        key: 'default_palette',
        value: { palette },
      },
      { onConflict: 'key' }
    )
  if (error) throw error
}
