import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  configureSensusSyncCron,
  getSensusSyncSettings,
  setSensusSyncAutoApplyNew,
  type SensusSyncCronMode,
} from '@/features/sensus-sync/services'

const scheduleLabels: Record<SensusSyncCronMode, string> = {
  off: 'Off',
  daily: 'Daily',
  every_3_days: 'Every 3 days',
  weekly: 'Weekly',
  every_2_weeks: 'Every 2 weeks',
  custom: 'Custom expression',
}

export function SensusSyncAutomationDialog() {
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({
    queryKey: ['sensus-sync', 'settings'],
    queryFn: getSensusSyncSettings,
  })
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<SensusSyncCronMode>('off')
  const [time, setTime] = useState('')
  const [expression, setExpression] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!settingsQuery.data || open) return
    setMode(settingsQuery.data.cron_mode ?? 'off')
    setTime(settingsQuery.data.cron_daily_time ?? '')
    setExpression(settingsQuery.data.cron_expression ?? '')
  }, [open, settingsQuery.data])

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['sensus-sync', 'settings'] })

  const saveSchedule = async () => {
    setSaving(true)
    try {
      const result = await configureSensusSyncCron(
        mode,
        mode === 'custom' || mode === 'off' ? null : time,
        mode === 'custom' ? expression : null
      )
      toast.success(
        result.cron_enabled
          ? `Schedule saved (${result.schedule} UTC)`
          : 'Scheduled sync turned off'
      )
      await refresh()
    } catch {
      toast.error('Could not save the sync schedule')
    } finally {
      setSaving(false)
    }
  }

  const toggleAutoApply = async (checked: boolean) => {
    setSaving(true)
    try {
      await setSensusSyncAutoApplyNew(checked)
      toast.success(
        checked
          ? 'New participants will be added automatically'
          : 'Automatic participant creation turned off'
      )
      await refresh()
    } catch {
      toast.error('Could not save automation settings')
    } finally {
      setSaving(false)
    }
  }

  const requiresTime = mode !== 'off' && mode !== 'custom'
  const saveDisabled =
    saving || (requiresTime && !time) || (mode === 'custom' && !expression)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' size='icon' aria-label='Sync automation'>
          <Settings2 className='size-4' />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync automation</DialogTitle>
          <DialogDescription>
            Schedule source staging in WIB. Automatic creation only applies to
            new rows without match candidates.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-5 py-2'>
          <div className='flex items-center justify-between gap-4 rounded-md border p-3'>
            <Label htmlFor='sensus-auto-apply-new' className='leading-5'>
              Automatically add new participants
            </Label>
            <Switch
              id='sensus-auto-apply-new'
              checked={settingsQuery.data?.auto_apply_new ?? false}
              disabled={saving || !settingsQuery.data}
              onCheckedChange={(value) => void toggleAutoApply(value)}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='sensus-cron-mode'>Schedule</Label>
            <Select
              value={mode}
              onValueChange={(value) => setMode(value as SensusSyncCronMode)}
            >
              <SelectTrigger id='sensus-cron-mode'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(scheduleLabels) as SensusSyncCronMode[]).map(
                  (value) => (
                    <SelectItem key={value} value={value}>
                      {scheduleLabels[value]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <p className='text-xs text-muted-foreground'>
              {(settingsQuery.data?.cron_mode ?? 'off') === 'off'
                ? 'No scheduled sync is active.'
                : `Current schedule: ${scheduleLabels[settingsQuery.data?.cron_mode ?? 'off']}`}
            </p>
          </div>
          {requiresTime && (
            <div className='grid gap-2'>
              <Label htmlFor='sensus-cron-time'>Time (WIB)</Label>
              <Input
                id='sensus-cron-time'
                type='time'
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
          )}
          {mode === 'custom' && (
            <div className='grid gap-2'>
              <Label htmlFor='sensus-cron-expression'>Cron expression</Label>
              <Input
                id='sensus-cron-expression'
                placeholder='0 1 * * 0'
                value={expression}
                onChange={(event) => setExpression(event.target.value)}
              />
              <p className='text-xs text-muted-foreground'>
                Use a five-field UTC cron expression.
              </p>
            </div>
          )}
          <Button disabled={saveDisabled} onClick={() => void saveSchedule()}>
            Save schedule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
