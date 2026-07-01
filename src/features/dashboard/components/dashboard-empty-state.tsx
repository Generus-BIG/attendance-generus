import { Link, type LinkProps } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type Action = {
  label: string
  to: LinkProps['to']
  show?: boolean
}

type Props = {
  title: string
  description: string
  primaryAction?: Action
}

export function DashboardEmptyState({
  title,
  description,
  primaryAction,
}: Props) {
  const showAction = primaryAction && primaryAction.show !== false
  return (
    <Card className='border-dashed' data-print-card>
      <CardContent className='flex flex-col items-center gap-3 py-12 text-center'>
        <h3 className='text-lg font-semibold text-balance'>{title}</h3>
        <p className='max-w-md text-sm text-pretty text-muted-foreground'>
          {description}
        </p>
        {showAction && primaryAction && (
          <Button asChild className='mt-2'>
            <Link to={primaryAction.to}>{primaryAction.label}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
