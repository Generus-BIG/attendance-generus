import { differenceInYears, parse } from 'date-fns'

// The apply RPC only returns { applied, failed } counts, so it cannot report
// per-item GPN A → GPN B rewrites from tg_participants_auto_promote_gpn.
// This helper infers the promotion from staged data: the RPC writes
// source_kategori, and the trigger promotes when the effective birth date
// (existing value, else source — matching the RPC's COALESCE) implies
// calculate_age >= 23. Same notice UX as the participants create/update
// mutations.
// ponytail: client-side inference, not a server-confirmed signal — exact
// per-item promotion reporting when the RPC returns it.
export function isSyncAutoPromoted(item: {
  source_kategori: string
  patch: {
    birth_date: string | null
    current?: { birth_date: string | null } | null
  }
}): boolean {
  if (item.source_kategori !== 'GPN A') return false
  const basis = item.patch.current?.birth_date ?? item.patch.birth_date
  if (!basis) return false
  return (
    differenceInYears(new Date(), parse(basis, 'yyyy-MM-dd', new Date())) >= 23
  )
}
