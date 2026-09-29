import { useEffect, useState } from 'react'
import { format } from 'date-fns'
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
  listCronSensusRuns,
  setSensusSyncAutoApplyNew,
  type SensusSyncCronMode,
} from '@/features/sensus-sync/services'

// WIB is a fixed UTC+7 offset (no DST). format() renders in the browser's
// timezone, so shift by WIB minus the browser offset to display true WIB wall
// time regardless of where the admin is.
const wibTime = (iso: string) => {
  const d = new Date(iso)
  return `${format(new Date(d.getTime() + (420 + d.getTimezoneOffset()) * 60_000), 'dd MMM yyyy, HH:mm')} WIB`
}

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
  const [showAllRuns, setShowAllRuns] = useState(false)
  const cronRunsQuery = useQuery({
    queryKey: ['sensus-sync', 'cron-runs'],
    queryFn: listCronSensusRuns,
    enabled: open,
    staleTime: 0,
  })

  useEffect(() => {
    if (!settingsQuery.data || open) return
    setMode(settingsQuery.data.cron_mode ?? 'off')
    setTime(settingsQuery.data.cron_daily_time ?? '')
    setExpression(settingsQuery.data.cron_expression ?? '')
  }, [open, settingsQuery.data])

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['sensus-sync'] })

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
      setOpen(false)
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
  const savedMode = settingsQuery.data?.cron_mode ?? 'off'
  const scheduleActive = Boolean(settingsQuery.data && savedMode !== 'off')
  const savedSchedule = !settingsQuery.data
    ? 'Checking saved schedule…'
    : savedMode === 'off'
      ? 'No schedule configured'
      : savedMode === 'custom'
        ? settingsQuery.data.cron_expression
        : `${scheduleLabels[savedMode]} at ${settingsQuery.data.cron_daily_time} WIB`

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant='outline'
          className={
            scheduleActive
              ? 'w-full gap-2 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/5 hover:text-emerald-700 sm:w-auto dark:text-emerald-400 dark:hover:text-emerald-400'
              : 'w-full gap-2 sm:w-auto'
          }
          aria-label='Configure sync automation'
        >
          <Settings2 className='size-4' />
          <span
            className={
              scheduleActive
                ? 'size-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px] shadow-emerald-500/20'
                : 'size-2 rounded-full bg-muted-foreground/50'
            }
          />
          {scheduleActive ? 'Active' : 'Inactive'}
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
            <p className='text-xs text-muted-foreground tabular-nums'>
              {savedSchedule}
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
          <div className='grid gap-2'>
            <p className='text-sm font-medium'>Recent scheduled runs</p>
            {cronRunsQuery.isLoading ? (
              <p className='text-xs text-muted-foreground'>
                Loading run history…
              </p>
            ) : !cronRunsQuery.data?.length ? (
              <p className='text-xs text-muted-foreground'>
                No scheduled runs recorded yet.
              </p>
            ) : (
              <>
                <ul className='grid gap-1.5'>
                  {(showAllRuns
                    ? cronRunsQuery.data
                    : cronRunsQuery.data.slice(0, 5)
                  ).map((run) => (
                    <li
                      key={run.id}
                      className='rounded-md border px-2.5 py-1.5 text-xs'
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <span className='tabular-nums'>
                          {wibTime(run.created_at)}
                        </span>
                        <span
                          className={
                            run.status === 'failed'
                              ? 'font-medium text-destructive'
                              : 'font-medium text-emerald-600 dark:text-emerald-400'
                          }
                        >
                          {run.status === 'failed' ? 'Failed' : 'Success'}
                        </span>
                      </div>
                      <p className='text-muted-foreground'>
                        {run.row_count} rows
                        {run.error ? ` — ${run.error}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
                {cronRunsQuery.data.length > 5 && (
                  <Button
                    variant='ghost'
                    size='sm'
                    className='text-xs text-muted-foreground'
                    onClick={() => setShowAllRuns((value) => !value)}
                  >
                    {showAllRuns
                      ? 'Show less'
                      : `Show more (${cronRunsQuery.data.length - 5} older)`}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
