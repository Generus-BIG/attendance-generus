import { useAuthStore } from '@/stores/auth-store'
import { Separator } from '@/components/ui/separator'
import { ContentSection } from '../components/content-section'
import { OrganizationThemeForm } from './organization-theme-form'
import { OrganizationDarkModeForm } from './organization-dark-mode-form'

export function SettingsAppearance() {
  const role = useAuthStore((s) => s.auth.role)
  const isSuperAdmin = role === 'super_admin'
  const isAdminOrAbove = role === 'super_admin' || role === 'admin'

  if (!isAdminOrAbove) {
    return (
      <ContentSection
        title='Appearance'
        desc='Customize the appearance of the organization.'
      >
        <div className='text-sm text-muted-foreground'>
          Anda tidak memiliki akses untuk mengubah pengaturan tampilan organisasi.
        </div>
      </ContentSection>
    )
  }

  return (
    <ContentSection
      title='Appearance'
      desc='Customize the appearance of the organization.'
    >
      <div className='space-y-10'>
        <OrganizationDarkModeForm />
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
