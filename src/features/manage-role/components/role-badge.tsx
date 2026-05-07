import { type Role, ROLE_LABELS } from '@/lib/rbac'
import { cn } from '@/lib/utils'

interface Props {
  role: Role
  className?: string
}

/**
 * Navy-anchored role badge. Visual weight encodes privilege:
 *   super_admin  → filled (strongest)
 *   admin        → outline
 *   team_manager → subtle tint
 *   member       → ghost (lightest)
 *
 * Replaces the rainbow purple/blue/amber/slate palette. See .impeccable.md
 * principle "Navy carries identity, warmth carries emphasis."
 */
export function RoleBadge({ role, className }: Props) {
  const styles: Record<Role, string> = {
    super_admin: 'bg-foreground text-background border-transparent',
    admin: 'border-foreground/60 text-foreground bg-transparent',
    team_manager: 'bg-muted text-foreground border-border',
    member: 'text-muted-foreground border-border bg-transparent',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[0.6875rem] font-medium tracking-[0.08em] uppercase',
        styles[role],
        className
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  )
}
