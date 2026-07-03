// Thin slide builder: composes per-slide renderers into the final ordered deck.
// Each renderer lives in `./slide-renderers/render-*.tsx`.
import { type ReactNode } from 'react'
import {
  type CharacterMonitoringActivityRow,
  type CharacterMonitoringReportRow,
  type MetricDefinitionRow,
  type MetricReportRow,
  type MonthlyReportRow,
  type MustinNoteRow,
  type MustinTemplateRow,
  type ProgramDefinitionRow,
  type ProgramReportRow,
  type SarprasItemRow,
  type SarprasReportRow,
  type SensusSnapshotRow,
  type ShodaqohRow,
} from '../../types'
import { formatMonthLabel } from '../../utils/month-utils'
import {
  renderCharacterAgendaSlide,
  renderCharacterSummarySlide,
} from './slide-renderers/render-character-monitoring'
import { renderClosingSlide } from './slide-renderers/render-closing'
import { renderCoverSlide } from './slide-renderers/render-cover'
import {
  renderDokumentasiSlides,
  type ActivityPhotoWithUrl,
} from './slide-renderers/render-dokumentasi'
import {
  renderMetricsAggregateSlide,
  renderMetricsCompareSlide,
  renderMetricsTableSlide,
} from './slide-renderers/render-metrics'
import { renderMustinSlide } from './slide-renderers/render-mustin'
import { renderProgramSlide } from './slide-renderers/render-program'
import { renderSarprasSlide } from './slide-renderers/render-sarpras'
import { renderSensusSlide } from './slide-renderers/render-sensus'
import { renderShodaqohSlide } from './slide-renderers/render-shodaqoh'
import { renderStatusSlide } from './slide-renderers/render-status'

export interface Slide {
  key: string
  title: string
  render: () => ReactNode
}

export interface Kelompok {
  id: string
  value: string
}

export interface PresentationData {
  monthKey: string
  kelompokList: Kelompok[]
  reports: MonthlyReportRow[]
  programs: ProgramDefinitionRow[]
  metrics: MetricDefinitionRow[]
  sarprasItems: SarprasItemRow[]
  sensusSnapshots: SensusSnapshotRow[]
  programReports: ProgramReportRow[]
  metricReports: MetricReportRow[]
  sarprasReports: SarprasReportRow[]
  shodaqohRows: ShodaqohRow[]
  mustinRows: MustinNoteRow[]
  mustinTemplates?: MustinTemplateRow[]
  characterActivities?: CharacterMonitoringActivityRow[]
  characterReports?: CharacterMonitoringReportRow[]
  kelompokFilter?: string
  activityPhotos?: ActivityPhotoWithUrl[]

  // Yearly trend data (kelompok mode):
  yearlyMonthlyReports?: MonthlyReportRow[]
  yearlyProgramReports?: ProgramReportRow[]
  yearlyMetricReports?: MetricReportRow[]
  yearlyMetricMonthlyReports?: MonthlyReportRow[]
  yearlyShodaqohRows?: ShodaqohRow[]
}

// Hardcoded program order requested by user (PHQ before Turba; SHOLAT_ACR/GMSU after GMKM).
// Includes codes that may be `active: false` in DB — presentation deck overrides that filter.
const PROGRAM_ORDER = [
  'PHQ',
  'TURBA_GPN',
  'NIKAH_JM',
  'GOMA',
  'GMKM',
  'SHOLAT_ACR',
] as const

function orderPrograms(
  programs: ProgramDefinitionRow[]
): ProgramDefinitionRow[] {
  const byCode = new Map(programs.map((p) => [p.code, p]))
  const ordered: ProgramDefinitionRow[] = []
  for (const code of PROGRAM_ORDER) {
    const p = byCode.get(code)
    if (p) ordered.push(p)
  }
  return ordered
}

export function buildSlides(data: PresentationData): Slide[] {
  const {
    monthKey,
    kelompokList,
    reports,
    programs,
    metrics,
    sarprasItems,
    sensusSnapshots,
    programReports,
    metricReports,
    sarprasReports,
    shodaqohRows,
    mustinRows,
    mustinTemplates = [],
    characterActivities = [],
    characterReports = [],
    kelompokFilter,
    yearlyMonthlyReports = [],
    yearlyProgramReports = [],
    yearlyMetricReports = [],
    yearlyMetricMonthlyReports = [],
    yearlyShodaqohRows = [],
  } = data

  const effectiveKelompokList = kelompokFilter
    ? kelompokList.filter((k) => k.id === kelompokFilter)
    : kelompokList

  const isSingleKelompok =
    !!kelompokFilter && effectiveKelompokList.length === 1

  const monthLabel = formatMonthLabel(monthKey).toUpperCase()

  const scope = (() => {
    if (!isSingleKelompok || !effectiveKelompokList[0]) return 'DESA BIG'
    const raw = effectiveKelompokList[0].value
    // Strip any leading "Kel", "KEL.", "Kel.", etc. then re-prefix uniformly.
    const stripped = raw.replace(/^kel\.?\s*/i, '').trim()
    return `KEL. ${stripped.toUpperCase()}`
  })()

  const orderedPrograms = orderPrograms(programs)
  const hasMetrics = metrics.length > 0

  // Two-pass build so SlideFrame footer can show "N / T".
  // Pass 1: collect descriptors.
  type Descriptor =
    | { kind: 'cover' }
    | { kind: 'status' }
    | { kind: 'sensus' }
    | { kind: 'metrics-table' }
    | {
        kind: 'metrics-compare'
        codes: readonly string[]
        monthsBack: number
        titleSuffix: string
      }
    | { kind: 'metrics-aggregate' }
    | { kind: 'sarpras' }
    | { kind: 'shodaqoh' }
    | { kind: 'program'; program: ProgramDefinitionRow }
    | { kind: 'character-agenda' }
    | { kind: 'character-summary' }
    | { kind: 'mustin' }
    | { kind: 'dokumentasi' }
    | { kind: 'closing' }

  const descriptors: Descriptor[] = []
  descriptors.push({ kind: 'cover' })
  if (!isSingleKelompok) descriptors.push({ kind: 'status' })
  descriptors.push({ kind: 'sensus' })
  if (hasMetrics) {
    descriptors.push({ kind: 'metrics-table' })
    descriptors.push({
      kind: 'metrics-compare',
      codes: ['ACR', 'APR', 'AR'],
      monthsBack: 3,
      titleSuffix: 'ACR · APR · AR',
    })
    descriptors.push({
      kind: 'metrics-compare',
      codes: ['GPN_A', 'GPN_B'],
      monthsBack: 5,
      titleSuffix: 'GPN A · GPN B',
    })
    descriptors.push({ kind: 'metrics-aggregate' })
  }
  descriptors.push({ kind: 'sarpras' })
  descriptors.push({ kind: 'shodaqoh' })
  for (const program of orderedPrograms) {
    descriptors.push({ kind: 'program', program })
  }
  descriptors.push({ kind: 'character-agenda' })
  descriptors.push({ kind: 'character-summary' })
  descriptors.push({ kind: 'mustin' })
  if ((data.activityPhotos ?? []).length > 0) {
    descriptors.push({ kind: 'dokumentasi' })
  }
  descriptors.push({ kind: 'closing' })

  const totalSlides = descriptors.length

  // Pass 2: materialize.
  const slides: Slide[] = []

  for (let i = 0; i < descriptors.length; i++) {
    const d = descriptors[i]
    const slideNumber = i + 1

    switch (d.kind) {
      case 'cover': {
        slides.push(
          renderCoverSlide({
            monthKey,
            monthLabel,
            isSingleKelompok,
            scope,
            pertemuanCount: undefined,
          })
        )
        break
      }
      case 'status': {
        slides.push(
          renderStatusSlide({
            monthLabel,
            scope,
            effectiveKelompokList,
            reports,
            slideNumber,
            totalSlides,
          })
        )
        break
      }
      case 'sensus': {
        slides.push(
          renderSensusSlide({
            monthKey,
            monthLabel,
            scope,
            isSingleKelompok,
            effectiveKelompokList,
            sensusSnapshots,
            slideNumber,
            totalSlides,
          })
        )
        break
      }
      case 'metrics-table': {
        slides.push(
          renderMetricsTableSlide({
            monthKey,
            monthLabel,
            scope,
            isSingleKelompok,
            kelompokFilter,
            effectiveKelompokList,
            metrics,
            reports,
            metricReports,
            yearlyMonthlyReports: yearlyMetricMonthlyReports,
            yearlyMetricReports,
            slideNumber,
            totalSlides,
          })
        )
        break
      }
      case 'metrics-compare': {
        slides.push(
          renderMetricsCompareSlide({
            monthKey,
            monthLabel,
            scope,
            isSingleKelompok,
            kelompokFilter,
            kategoriCodes: d.codes,
            monthsBack: d.monthsBack,
            titleSuffix: d.titleSuffix,
            metrics,
            yearlyMonthlyReports: yearlyMetricMonthlyReports,
            yearlyMetricReports,
            slideNumber,
            totalSlides,
          })
        )
        break
      }
      case 'metrics-aggregate': {
        slides.push(
          renderMetricsAggregateSlide({
            monthKey,
            monthLabel,
            scope,
            isSingleKelompok,
            kelompokFilter,
            metrics,
            yearlyMonthlyReports: yearlyMetricMonthlyReports,
            yearlyMetricReports,
            slideNumber,
            totalSlides,
          })
        )
        break
      }
      case 'sarpras': {
        slides.push(
          renderSarprasSlide({
            monthLabel,
            scope,
            isSingleKelompok,
            effectiveKelompokList,
            reports,
            sarprasItems,
            sarprasReports,
            slideNumber,
            totalSlides,
          })
        )
        break
      }
      case 'shodaqoh': {
        slides.push(
          renderShodaqohSlide({
            monthKey,
            monthLabel,
            scope,
            isSingleKelompok,
            kelompokFilter,
            effectiveKelompokList,
            reports,
            shodaqohRows,
            yearlyMonthlyReports,
            yearlyShodaqohRows,
            slideNumber,
            totalSlides,
          })
        )
        break
      }
      case 'program': {
        slides.push(
          renderProgramSlide({
            program: d.program,
            monthKey,
            monthLabel,
            scope,
            isSingleKelompok,
            kelompokFilter,
            effectiveKelompokList,
            reports,
            programReports,
            yearlyMonthlyReports,
            yearlyProgramReports,
            slideNumber,
            totalSlides,
          })
        )
        break
      }
      case 'character-agenda': {
        slides.push(
          renderCharacterAgendaSlide({
            monthLabel,
            scope,
            effectiveKelompokList,
            reports,
            activities: characterActivities,
            characterReports,
            slideNumber,
            totalSlides,
          })
        )
        break
      }
      case 'character-summary': {
        slides.push(
          renderCharacterSummarySlide({
            monthLabel,
            scope,
            effectiveKelompokList,
            reports,
            activities: characterActivities,
            characterReports,
            slideNumber,
            totalSlides,
          })
        )
        break
      }
      case 'mustin': {
        slides.push(
          renderMustinSlide({
            monthLabel,
            scope,
            isSingleKelompok,
            effectiveKelompokList,
            reports,
            mustinRows,
            mustinTemplates,
            slideNumber,
            totalSlides,
          })
        )
        break
      }
      case 'dokumentasi': {
        const docSlides = renderDokumentasiSlides({
          monthLabel,
          scope,
          photos: data.activityPhotos ?? [],
          slideNumber,
          totalSlides,
        })
        slides.push(...docSlides)
        break
      }
      case 'closing': {
        slides.push(renderClosingSlide({ monthLabel }))
        break
      }
    }
  }

  return slides
}
