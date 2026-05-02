import { z } from 'zod'

/**
 * Extras payload shape for NIKAH_JM program.
 * Stored as jsonb in lupg_program_reports.extras.
 * Other programs leave extras as empty object {}.
 */
export const nikahClusterExtrasSchema = z.object({
  not_ready: z.number().int().nonnegative().default(0),
  ready: z.number().int().nonnegative().default(0),
  married: z.number().int().nonnegative().default(0),
})

export type NikahClusterExtras = z.infer<typeof nikahClusterExtrasSchema>

/**
 * Parse extras field from DB row. Returns zeroed cluster on parse failure
 * so UI renders without crashing for legacy rows or malformed data.
 */
export function parseNikahClusterExtras(
  value: unknown
): NikahClusterExtras {
  const result = nikahClusterExtrasSchema.safeParse(value)
  return result.success
    ? result.data
    : { not_ready: 0, ready: 0, married: 0 }
}
