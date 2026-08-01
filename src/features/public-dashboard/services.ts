import { parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import {
  DEFAULT_PUBLIC_DASHBOARD_SECTIONS,
  type PublicDashboardVisibleSections,
} from '@/features/dashboard-sharing/types'
import {
  aggregateMonthlyRecap,
  type CensusParticipant,
} from '@/features/dashboard/services/dashboard-recap.service'
import {
  type PublicDashboardPayload,
  type PublicDashboardRecord,
} from './types'

type RpcPayload = {
  status: 'ok' | 'unavailable'
  share?: {
    id: string
    name: string
    token: string
    visibleSections?: Partial<PublicDashboardVisibleSections>
    displayMode?: 'monthly' | 'forms'
    formMode: 'all' | 'selected'
    formIds?: string[]
  }
  forms?: Array<{ id: string; title: string; date: string }>
  records?: PublicDashboardRecord[]
  censusParticipants?: CensusParticipant[]
}

export async function fetchPublicDashboardPayload(
  token: string,
  monthKey: string
): Promise<PublicDashboardPayload> {
  const { data, error } = await supabase.rpc('get_public_dashboard_payload', {
    p_token: token,
    p_month: monthKey,
  })

  if (error) throw error

  const payload = data as RpcPayload | null
  if (!payload || payload.status !== 'ok' || !payload.share) {
    return { status: 'unavailable' }
  }

  const visibleSections = {
    ...DEFAULT_PUBLIC_DASHBOARD_SECTIONS,
    ...(payload.share.visibleSections ?? {}),
  }
  const records = payload.records ?? []
  const censusParticipants = payload.censusParticipants ?? []
  const forms = payload.forms ?? []
  const displayMode = payload.share.displayMode ?? 'monthly'
  const recap = aggregateMonthlyRecap(
    records,
    parseISO(`${monthKey}-01`),
    censusParticipants
  )

  return {
    status: 'ok',
    share: {
      id: payload.share.id,
      name: payload.share.name,
      token: payload.share.token,
      visibleSections,
      displayMode,
      formMode: payload.share.formMode,
      formIds: payload.share.formIds ?? [],
    },
    forms,
    records,
    censusParticipants,
    recap,
  }
}
