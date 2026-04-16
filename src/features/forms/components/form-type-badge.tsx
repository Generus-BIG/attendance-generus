interface FormTypeBadgeProps {
  formType: 'desa' | 'kelompok'
  kelompokName?: string | null
}

export function FormTypeBadge({ formType, kelompokName }: FormTypeBadgeProps) {
  const label = formType === 'desa' ? 'Desa' : (kelompokName ?? 'Kelompok')

  return (
    <span className='text-xs font-medium text-muted-foreground'>
      {label}
    </span>
  )
}
