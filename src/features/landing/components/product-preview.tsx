import { useState, type CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Workspace = 'absensi' | 'lupg' | 'presentation'

const screenshots = {
  absensi: {
    src: '/images/landing/absensi-dashboard.png',
    label: 'Attendance',
    title: 'Absensi MuMiBig',
    description:
      'Meeting totals, attendance by group, and a calendar of activity.',
    alt: 'Absensi dashboard with September 2026 selected, showing meeting totals, attendance rates by group, and an attendance calendar.',
    detailAlt: 'Group attendance chart from the Absensi September 2026 view.',
    detailCaption: 'Compare attendance across groups',
  },
  lupg: {
    src: '/images/landing/lupg-dashboard.png',
    label: 'LUPG overview',
    title: 'LUPG',
    description:
      'Program results, the current census, and monthly trends in one view.',
    alt: 'LUPG village overview with September 2026 selected, showing program progress, the current participant census, and monthly trends.',
    detailAlt:
      'Twelve-month program trend chart from the LUPG September 2026 view.',
    detailCaption: 'See how program results change over time',
  },
  presentation: {
    src: '/images/landing/lupg-presentation.png',
    label: 'Presentation Mode',
    title: 'LUPG presentation',
    description:
      'Bring the monthly recap to your meeting, with slides ready to present.',
    alt: 'LUPG presentation mode in the light Modern theme, showing the September 2026 Desa BIG cover, presentation toolbar, and slide thumbnails.',
    detailAlt:
      'Cover and slide thumbnails from the LUPG September 2026 presentation in light mode.',
    detailCaption: 'Review the month together',
  },
}

const workspaces = Object.keys(screenshots) as Workspace[]

export function DashboardScreenshot({
  workspace,
  eager = false,
  detail = false,
}: {
  workspace: Workspace
  eager?: boolean
  detail?: boolean
}) {
  const [imageStatus, setImageStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading'
  )
  const screenshot = screenshots[workspace]

  return (
    <figure
      className={cn(
        'landing-dashboard-screenshot',
        detail && 'landing-dashboard-detail'
      )}
      data-workspace={workspace}
    >
      <div className='landing-screenshot-frame'>
        <div className='landing-dashboard-viewport'>
          <div className='landing-dashboard-crop'>
            <img
              src={screenshot.src}
              alt={detail ? screenshot.detailAlt : screenshot.alt}
              width={workspace === 'presentation' ? 3600 : 1248}
              height={workspace === 'presentation' ? 2260 : 900}
              loading={eager ? 'eager' : 'lazy'}
              fetchPriority={eager ? 'high' : 'auto'}
              decoding='async'
              className={cn(imageStatus !== 'ready' && 'invisible')}
              onLoad={() => setImageStatus('ready')}
              onError={() => setImageStatus('error')}
            />
          </div>
          {imageStatus !== 'ready' && (
            <div className='landing-image-status' role='status'>
              {imageStatus === 'loading' ? (
                <p>Loading dashboard preview…</p>
              ) : (
                <>
                  <p>This preview could not load.</p>
                  <Link
                    to='/admin'
                    preload={false}
                    className='landing-nav-link underline underline-offset-4'
                  >
                    Open the dashboard
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <figcaption>
        <span>{detail ? screenshot.detailCaption : screenshot.title}</span>
        <span>September 2026 view</span>
      </figcaption>
    </figure>
  )
}

export function ProductPreview() {
  const [activeWorkspace, setActiveWorkspace] = useState('absensi')

  return (
    <div className='landing-product-preview'>
      <div className='landing-preview-heading'>
        <h2>Inside the workspaces</h2>
        <span>Actual product captures</span>
      </div>
      <Tabs
        value={activeWorkspace}
        onValueChange={setActiveWorkspace}
        className='gap-0'
      >
        <TabsList
          className='landing-preview-tabs'
          aria-label='Workspace preview'
          style={
            {
              '--active-tab': workspaces.indexOf(activeWorkspace as Workspace),
            } as CSSProperties
          }
        >
          {workspaces.map((workspace) => (
            <TabsTrigger
              key={workspace}
              value={workspace}
              className='landing-preview-tab'
            >
              {screenshots[workspace].label}
            </TabsTrigger>
          ))}
        </TabsList>
        {workspaces.map((workspace) => (
          <TabsContent
            key={workspace}
            value={workspace}
            className='landing-preview-panel'
          >
            <DashboardScreenshot workspace={workspace} eager />
            <p className='landing-preview-description'>
              {screenshots[workspace].description}
            </p>
          </TabsContent>
        ))}
      </Tabs>
      <p className='landing-capture-note'>
        Historical views, shown in the original Indonesian interface.
      </p>
    </div>
  )
}
