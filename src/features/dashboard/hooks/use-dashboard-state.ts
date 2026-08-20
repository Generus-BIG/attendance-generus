import { useMemo } from 'react'
import { format, addMonths, subMonths, startOfMonth, parseISO } from 'date-fns'
import { Route } from '@/routes/admin/dashboard'
import { type DashboardTab } from '../types'

export function useDashboardState() {
  const { tab, month, kelompokId, formId, q, fGroup, fCategory } =
    Route.useSearch()
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
        q: undefined,
        fGroup: undefined,
        fCategory: undefined,
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
      search: (prev) => ({ ...prev, kelompokId: id, fGroup: undefined }),
    })
  }

  const setFormId = (id: string | undefined) => {
    navigate({
      search: (prev) => ({ ...prev, formId: id }),
    })
  }

  const setQ = (value: string | undefined) => {
    navigate({
      search: (prev) => ({
        ...prev,
        q: value && value.length > 0 ? value : undefined,
      }),
    })
  }

  const setFGroup = (value: string[] | undefined) => {
    navigate({
      search: (prev) => ({
        ...prev,
        fGroup: value && value.length > 0 ? value : undefined,
      }),
    })
  }

  const setFCategory = (value: string[] | undefined) => {
    navigate({
      search: (prev) => ({
        ...prev,
        fCategory: value && value.length > 0 ? value : undefined,
      }),
    })
  }

  return {
    tab,
    monthDate,
    monthString: month,
    kelompokId,
    formId,
    q,
    fGroup,
    fCategory,
    setTab,
    setMonth,
    prevMonth,
    nextMonth,
    jumpToCurrentMonth,
    setKelompokId,
    setFormId,
    setQ,
    setFGroup,
    setFCategory,
  }
}
