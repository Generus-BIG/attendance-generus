import { useState, type CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu, Moon, Sun } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useTheme } from '@/context/theme-provider'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ChartStory } from './components/chart-story'
import { ProductPreview } from './components/product-preview'

const navigation = [
  { label: 'Attendance', href: '#absensi' },
  { label: 'LUPG', href: '#lupg' },
  { label: 'Workflow', href: '#alur-kerja' },
]

const workflow = [
  {
    title: 'Keep records current',
    description: 'Update participants, groups, and categories in Absensi.',
  },
  {
    title: 'Record each meeting',
    description: 'Collect attendance and use the recap to guide follow-up.',
  },
  {
    title: 'Complete the month',
    description: 'Prepare and submit each group’s report in LUPG.',
  },
  {
    title: 'Review together',
    description: 'Use the village overview to discuss progress and next steps.',
  },
]

const questions = [
  {
    question: 'Who can use the dashboard?',
    answer:
      'Desa BIG administrators and assigned group teams. Sign in with your existing account; your role and group determine the workspaces and menus available to you.',
  },
  {
    question: 'How are Absensi and LUPG different?',
    answer:
      'Absensi MuMiBig handles participant records and meeting attendance. LUPG brings together monthly group reports, program progress, and village reviews.',
  },
  {
    question: 'Do participants need an account to record attendance?',
    answer:
      'No. Participants can use the attendance form link shared for an active meeting. The dashboard is for the teams managing and reviewing those records.',
  },
  {
    question: 'Do reports fill themselves in?',
    answer:
      'Generus census counts follow participant records automatically. Groups still complete their monthly report, enter educator counts, and submit it when ready.',
  },
  {
    question: 'Can a submitted report be corrected?',
    answer:
      'Submitted reports are locked for review. An administrator can reopen a report when the group needs to make a correction.',
  },
  {
    question: 'Can we use the recap in a meeting?',
    answer:
      'Yes. LUPG includes a presentation view and PowerPoint export. Authorized users can also share a read-only presentation link.',
  },
]

function ScrollText({ text }: { text: string }) {
  const words = text.split(' ')

  return words.map((word, index) => (
    <span
      key={`${index}-${word}`}
      className='landing-scroll-word'
      style={
        {
          '--word-start': `${10 + (index / words.length) * 25}%`,
          '--word-end': `${15 + (index / words.length) * 25}%`,
        } as CSSProperties
      }
    >
      {word}
      {index < words.length - 1 ? ' ' : ''}
    </span>
  ))
}

function LandingHeader({ dashboardLabel }: { dashboardLabel: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <header className='landing-header'>
      <div className='landing-container flex h-18 items-center justify-between gap-4'>
        <a
          href='#top'
          className='landing-wordmark'
          aria-label='Generus Desa BIG, home'
        >
          <span>Generus</span>
          <span className='landing-wordmark-divider' aria-hidden='true'>
            /
          </span>
          <span className='text-sm font-normal text-muted-foreground'>
            Desa BIG
          </span>
        </a>
        <nav
          className='hidden items-center gap-7 lg:flex'
          aria-label='Main navigation'
        >
          {navigation.map((item) => (
            <a key={item.href} href={item.href} className='landing-nav-link'>
              {item.label}
            </a>
          ))}
        </nav>
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='icon'
            className='size-11'
            aria-label={
              isDark ? 'Switch to light theme' : 'Switch to dark theme'
            }
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
          >
            {isDark ? <Sun aria-hidden='true' /> : <Moon aria-hidden='true' />}
          </Button>
          <Button asChild className='hidden h-11 sm:inline-flex'>
            <Link to='/admin' preload={false}>
              {dashboardLabel}
            </Link>
          </Button>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant='outline'
                size='icon'
                className='size-11 lg:hidden'
                aria-label='Open navigation menu'
              >
                <Menu aria-hidden='true' />
              </Button>
            </SheetTrigger>
            <SheetContent className='landing-theme landing-mobile-menu w-[min(88vw,24rem)] motion-reduce:animate-none'>
              <SheetHeader className='pt-14'>
                <SheetTitle>Generus Desa BIG</SheetTitle>
                <SheetDescription>
                  Absensi MuMiBig attendance and LUPG monthly reports.
                </SheetDescription>
              </SheetHeader>
              <nav
                className='flex flex-col gap-2 px-4'
                aria-label='Mobile navigation'
              >
                {navigation.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <a className='landing-mobile-link' href={item.href}>
                      {item.label}
                    </a>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Button asChild className='mt-5 h-12'>
                    <Link to='/admin' preload={false}>
                      {dashboardLabel}
                    </Link>
                  </Button>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

export function LandingPage() {
  const signedIn = useAuthStore((state) => Boolean(state.auth.accessToken))
  const dashboardLabel = signedIn ? 'Open dashboard' : 'Sign in to dashboard'

  return (
    <div id='top' className='landing-theme landing-page'>
      <a href='#konten' className='landing-skip-link'>
        Skip to content
      </a>
      <LandingHeader dashboardLabel={signedIn ? 'Open dashboard' : 'Sign In'} />
      <main id='konten' tabIndex={-1}>
        <section
          className='landing-container landing-hero'
          aria-labelledby='landing-title'
        >
          <div className='landing-hero-copy'>
            <h1 id='landing-title'>
              Every meeting.
              <br />
              Every month.
              <br />
              <span>One clear picture.</span>
            </h1>
            <p className='landing-hero-description'>
              Keep attendance together in Absensi MuMiBig. Bring monthly
              progress into focus with LUPG. A shared place for the people
              supporting Desa BIG.
            </p>
            <div className='landing-hero-actions'>
              <Button asChild size='lg' className='h-12 px-6'>
                <Link to='/admin' preload={false}>
                  {dashboardLabel}
                </Link>
              </Button>
              <a href='#ruang-kerja' className='landing-text-link'>
                Explore the workspaces
              </a>
            </div>
            <p className='landing-hero-note'>
              For Desa BIG administrators and group teams.
            </p>
          </div>
          <div className='landing-hero-preview'>
            <ProductPreview />
          </div>
        </section>

        <section
          id='ruang-kerja'
          className='landing-container landing-workspaces'
          aria-labelledby='workspaces-title'
        >
          <div className='landing-section-intro'>
            <h2 id='workspaces-title' data-scroll-copy>
              <ScrollText text='Close to the details. Clear on the bigger picture.' />
            </h2>
            <p>
              From recording a meeting to reviewing a month, each workspace has
              a clear job. Your team works with the same participant records and
              a shared view of progress.
            </p>
          </div>

          <article
            id='absensi'
            className='landing-workspace'
            aria-labelledby='absensi-title'
          >
            <div className='landing-workspace-heading'>
              <h3 id='absensi-title' data-scroll-copy>
                <ScrollText text='A clear record of who showed up.' />
              </h3>
              <p>
                Keep participant records current, record each meeting, and use
                the recap to guide follow-up.
              </p>
            </div>
            <ChartStory workspace='absensi' />
          </article>

          <article
            id='lupg'
            className='landing-workspace landing-lupg-workspace'
            aria-labelledby='lupg-title'
          >
            <div className='landing-workspace-heading'>
              <h3 id='lupg-title' data-scroll-copy>
                <ScrollText text='Bring the month into perspective.' />
              </h3>
              <p>
                Bring group reports into a village overview, review progress
                together, and take the recap into your next presentation.
              </p>
            </div>
            <ChartStory workspace='lupg' />
          </article>
        </section>

        <section
          id='alur-kerja'
          className='landing-workflow-section'
          aria-labelledby='workflow-title'
        >
          <div className='landing-container'>
            <div className='landing-workflow-heading'>
              <h2 id='workflow-title'>
                Good records.
                <br />
                More useful conversations.
              </h2>
              <p>
                Give every group a place to contribute and every review a clear
                starting point.
              </p>
            </div>
            <ol className='landing-workflow'>
              {workflow.map((step) => (
                <li key={step.title}>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          className='landing-container landing-questions'
          aria-labelledby='questions-title'
        >
          <div className='landing-questions-intro'>
            <h2 id='questions-title'>Before you sign in.</h2>
            <p>
              A few things to know about accounts, attendance, and monthly
              reporting.
            </p>
            <p>Need an account? Contact your Desa BIG administrator.</p>
          </div>
          <dl className='landing-question-list'>
            {questions.map(({ question, answer }) => (
              <div key={question}>
                <dt>{question}</dt>
                <dd>{answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          className='landing-container landing-access'
          aria-labelledby='access-title'
        >
          <div className='landing-access-content'>
            <div className='landing-access-copy'>
              <h2 id='access-title'>
                Your next meeting.
                <br />
                Your next month.
                <br />
                Start here.
              </h2>
              <p>Open your workspace and pick up where your team left off.</p>
              <div className='landing-access-action'>
                <Button
                  asChild
                  size='lg'
                  variant='secondary'
                  className='h-12 px-7'
                >
                  <Link to='/admin' preload={false}>
                    {dashboardLabel}
                  </Link>
                </Button>
                <p>Use your assigned Desa BIG account.</p>
              </div>
            </div>
            <img
              className='landing-access-image'
              src='/images/landing/community-meeting.png'
              alt='Illustration of a community team planning a gathering around a warmly lit table.'
              width={1536}
              height={1024}
              loading='lazy'
              decoding='async'
            />
          </div>
        </section>
      </main>
      <footer className='landing-container landing-footer'>
        <div className='flex flex-col gap-1'>
          <p className='font-semibold'>Generus Desa BIG</p>
          <p className='text-sm text-muted-foreground'>
            Absensi MuMiBig · LUPG
          </p>
        </div>
        <a href='#top' className='landing-nav-link'>
          Back to top
        </a>
      </footer>
    </div>
  )
}
