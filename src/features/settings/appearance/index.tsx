import { useAuthStore } from '@/stores/auth-store'
import { Separator } from '@/components/ui/separator'
import { ContentSection } from '../components/content-section'
import { AppearanceForm } from './appearance-form'
import { OrganizationThemeForm } from './organization-theme-form'

export function SettingsAppearance() {
  const role = useAuthStore((s) => s.auth.role)
  const isSuperAdmin = role === 'super_admin'

  return (
    <ContentSection
      title='Appearance'
      desc='Customize the appearance of the app. Automatically switch between day
          and night themes.'
    >
      <div className='space-y-10'>
        <AppearanceForm />
        {isSuperAdmin && (
          <>
            <Separator />
            <OrganizationThemeForm />
          </>
        )}
      </div>
    </ContentSection>
  )
}
