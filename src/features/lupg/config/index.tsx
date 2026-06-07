import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { CharacterMonitoringConfigTab } from './character-monitoring-tab'
import { CharacterTargetTemplatesTab } from './character-target-templates-tab'
import { MetricsConfigTab } from './metrics-tab'
import { MustinTemplatesConfigTab } from './mustin-templates-tab'
import { ProgramsConfigTab } from './programs-tab'
import { SarprasConfigTab } from './sarpras-tab'

export function LupgConfig() {
  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>
            Konfigurasi LUPG
          </h2>
          <p className='text-muted-foreground'>
            Kelola definisi program, metric, item sarpras, dan template
            resume mustin. Perubahan di sini langsung muncul di form laporan
            bulanan.
          </p>
        </div>

        <Tabs defaultValue='programs'>
          <div className='overflow-x-auto pb-1'>
            <TabsList className='w-max'>
              <TabsTrigger value='programs'>Programs</TabsTrigger>
              <TabsTrigger value='metrics'>Metrics</TabsTrigger>
              <TabsTrigger value='sarpras'>Sarpras Items</TabsTrigger>
              <TabsTrigger value='mustin'>Template Mustin</TabsTrigger>
              <TabsTrigger value='character'>Penerapan 29 Karakter</TabsTrigger>
              <TabsTrigger value='character-targets'>Target Materi</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value='programs' className='mt-4'>
            <ProgramsConfigTab />
          </TabsContent>

          <TabsContent value='metrics' className='mt-4'>
            <MetricsConfigTab />
          </TabsContent>

          <TabsContent value='sarpras' className='mt-4'>
            <SarprasConfigTab />
          </TabsContent>

          <TabsContent value='mustin' className='mt-4'>
            <MustinTemplatesConfigTab />
          </TabsContent>

          <TabsContent value='character' className='mt-4'>
            <CharacterMonitoringConfigTab />
          </TabsContent>

          <TabsContent value='character-targets' className='mt-4'>
            <CharacterTargetTemplatesTab />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
