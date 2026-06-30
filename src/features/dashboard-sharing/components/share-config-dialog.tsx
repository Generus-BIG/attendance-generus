import { useMemo, useState } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import type { DashboardFormItem } from '@/features/dashboard/types'
import { useUpsertDashboardShare } from '../hooks'
import {
  DEFAULT_PUBLIC_DASHBOARD_SECTIONS,
  type DashboardShareConfig,
  type PublicDashboardVisibleSections,
} from '../types'
import { ShareSectionsControl } from './share-sections-control'

interface ShareConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  share: DashboardShareConfig | null
  forms: DashboardFormItem[]
}

export function ShareConfigDialog({
  open,
  onOpenChange,
  share,
  forms,
}: ShareConfigDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <ShareConfigDialogContent
          key={share?.id ?? 'new-share'}
          onOpenChange={onOpenChange}
          share={share}
          forms={forms}
        />
      )}
    </Dialog>
  )
}

interface ShareConfigDialogContentProps {
  onOpenChange: (open: boolean) => void
  share: DashboardShareConfig | null
  forms: DashboardFormItem[]
}

function ShareConfigDialogContent({
  onOpenChange,
  share,
  forms,
}: ShareConfigDialogContentProps) {
  const mutation = useUpsertDashboardShare()
  const [name, setName] = useState(share?.name ?? '')
  const [isActive, setIsActive] = useState(share?.isActive ?? true)
  const [formMode, setFormMode] = useState<'all' | 'selected'>(
    share?.formMode ?? 'all'
  )
  const [formIds, setFormIds] = useState<string[]>(share?.formIds ?? [])
  const [visibleSections, setVisibleSections] =
    useState<PublicDashboardVisibleSections>(
      share?.visibleSections ?? DEFAULT_PUBLIC_DASHBOARD_SECTIONS
    )

  const publicUrl = useMemo(() => {
    if (!share?.token) return ''
    return `${window.location.origin}/share/dashboard/${share.token}`
  }, [share?.token])

  const canSubmit =
    name.trim().length >= 2 && (formMode === 'all' || formIds.length > 0)

  async function handleSubmit() {
    if (!canSubmit) return

    await mutation.mutateAsync({
      id: share?.id,
      name: name.trim(),
      isActive,
      formMode,
      formIds,
      visibleSections,
    })
    onOpenChange(false)
  }

  async function copyLink() {
    if (!publicUrl) return
    await navigator.clipboard.writeText(publicUrl)
    toast.success('Link publik disalin.')
  }

  return (
    <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
      <DialogHeader>
        <DialogTitle>
          {share ? 'Edit Dashboard Sharing' : 'Buat Dashboard Sharing'}
        </DialogTitle>
      </DialogHeader>

      <div className='space-y-5'>
        <div className='grid gap-2'>
          <Label htmlFor='share-name'>Nama link</Label>
          <Input
            id='share-name'
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder='Contoh: Semua Form Desa'
          />
        </div>

        {publicUrl && (
          <div className='grid gap-2'>
            <Label>Public link</Label>
            <div className='flex gap-2'>
              <Input value={publicUrl} readOnly />
              <Button type='button' variant='outline' onClick={copyLink}>
                <Copy className='mr-2 h-4 w-4' />
                Copy
              </Button>
            </div>
          </div>
        )}

        <label className='flex items-center justify-between gap-4 rounded-md border px-3 py-2'>
          <span className='text-sm font-medium'>Aktifkan public link</span>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </label>

        <div className='grid gap-2'>
          <Label>Form yang dishare</Label>
          <Select
            value={formMode}
            onValueChange={(value) => setFormMode(value as 'all' | 'selected')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Semua Form Desa</SelectItem>
              <SelectItem value='selected'>Beberapa Form Tertentu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formMode === 'selected' && (
          <div className='max-h-48 space-y-2 overflow-y-auto rounded-md border p-3'>
            {forms.map((form) => (
              <label key={form.id} className='flex items-center gap-2 text-sm'>
                <Checkbox
                  checked={formIds.includes(form.id)}
                  onCheckedChange={(checked) => {
                    setFormIds((current) =>
                      checked
                        ? [...current, form.id]
                        : current.filter((id) => id !== form.id)
                    )
                  }}
                />
                {form.title}
              </label>
            ))}
          </div>
        )}

        <ShareSectionsControl
          value={visibleSections}
          onChange={setVisibleSections}
        />
      </div>

      <DialogFooter>
        <Button variant='outline' onClick={() => onOpenChange(false)}>
          Batal
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || mutation.isPending}
        >
          Simpan
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
