import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

export type UtilityHeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  leftSlot?: React.ReactNode
  rightSlot?: React.ReactNode
  children?: React.ReactNode
}

export function UtilityHeader({
  fixed = true,
  leftSlot,
  rightSlot,
  children,
  className,
  ...props
}: UtilityHeaderProps) {
  return (
    <Header fixed={fixed} className={className} {...props}>
      {leftSlot ?? <Search />}
      {children}
      <div className='ms-auto flex items-center space-x-4'>
        {rightSlot}
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </div>
    </Header>
  )
}
