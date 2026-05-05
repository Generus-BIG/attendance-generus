import { useMemo } from 'react'
import { Route } from '@/routes/admin/dashboard'
import { format, addMonths, subMonths, startOfMonth, parseISO } from 'date-fns'
import { type DashboardTab } from '../types'

export function useDashboardState() {
  const { tab, month, kelompokId, formId } = Route.useSearch()
  const navigate = Route.useNavigate()

  // Stable Date object — only recalculated when `month` string changes
  const monthDate = useMemo(
    () => startOfMonth(parseISO(`${month}-01`)),
    [month]
  )

  const setTab = (newTab: DashboardTab) => {
    navigate({
      search: (prev) => ({
        ...prev,
        tab: newTab,
        formId: undefined,
        kelompokId: newTab === 'kelompok' ? prev.kelompokId : undefined,
      }),
    })
  }

  const setMonth = (newMonth: Date) => {
    navigate({
      search: (prev) => ({
        ...prev,
        month: format(newMonth, 'yyyy-MM'),
        formId: undefined,
      }),
    })
  }

  const prevMonth = () => setMonth(subMonths(monthDate, 1))
  const nextMonth = () => setMonth(addMonths(monthDate, 1))
  const jumpToCurrentMonth = () => setMonth(startOfMonth(new Date()))

  const setKelompokId = (id: string) => {
    navigate({
      search: (prev) => ({ ...prev, kelompokId: id }),
    })
  }

  const setFormId = (id: string | undefined) => {
    navigate({
      search: (prev) => ({ ...prev, formId: id }),
    })
  }

  return {
    tab,
    monthDate,
    monthString: month,
    kelompokId,
    formId,
    setTab,
    setMonth,
    prevMonth,
    nextMonth,
    jumpToCurrentMonth,
    setKelompokId,
    setFormId,
  }
}
