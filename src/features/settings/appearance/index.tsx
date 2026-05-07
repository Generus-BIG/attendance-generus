import { useAuthStore } from '@/stores/auth-store'
import { Separator } from '@/components/ui/separator'
import { ContentSection } from '../components/content-section'
import { AppearanceForm } from './appearance-form'
import { OrganizationThemeForm } from './organization-theme-form'
import { OrganizationDarkModeForm } from './organization-dark-mode-form'

export function SettingsAppearance() {
  const role = useAuthStore((s) => s.auth.role)
  const isSuperAdmin = role === 'super_admin'
  const isAdminOrAbove = role === 'super_admin' || role === 'admin'

  return (
    <ContentSection
      title='Appearance'
      desc='Customize the appearance of the app. Automatically switch between day
          and night themes.'
    >
      <div className='space-y-10'>
        <AppearanceForm />
        {isAdminOrAbove && (
          <>
            <Separator />
            <OrganizationDarkModeForm />
          </>
        )}
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
