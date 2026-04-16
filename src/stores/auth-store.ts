import type { User, Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { getCookie, setSessionCookie } from '@/lib/cookies'
import { type Role } from '@/lib/rbac'
import { supabase } from '@/lib/supabase'

const BROWSER_SESSION_COOKIE = 'absensi_browser_session'

interface AuthState {
  auth: {
    user: User | null
    session: Session | null
    accessToken: string | null
    role: Role
    kelompok: string | null
    isLoading: boolean
    checkSession: () => Promise<void>
    signOut: () => Promise<void>
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  auth: {
    user: null,
    session: null,
    accessToken: null,
    role: 'member' as Role,
    kelompok: null as string | null,
    isLoading: true,
    checkSession: async () => {
      try {
        // If the browser was fully closed, session cookies are cleared.
        // Supabase auth persists in localStorage, so we explicitly clear it
        // on the next app start when no browser-session cookie exists.
        const hasBrowserSession = !!getCookie(BROWSER_SESSION_COOKIE)
        if (!hasBrowserSession) {
          try {
            await supabase.auth.signOut()
          } catch {
            // Ignore network errors; we mainly need local state cleared.
          }
          setSessionCookie(BROWSER_SESSION_COOKIE, '1')
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()
        set((state) => ({
          ...state,
          auth: {
            ...state.auth,
            session,
            user: session?.user ?? null,
            accessToken: session?.access_token ?? null,
            role: (session?.user?.app_metadata?.role as Role) ?? 'member',
            kelompok: (session?.user?.app_metadata?.kelompok as string) ?? null,
            isLoading: false,
          },
        }))
      } catch {
        set((state) => ({
          ...state,
          auth: { ...state.auth, isLoading: false },
        }))
      }
    },
    signOut: async () => {
      await supabase.auth.signOut()
      set((state) => ({
        ...state,
        auth: {
          ...state.auth,
          user: null,
          session: null,
          accessToken: null,
          role: 'member' as Role,
          kelompok: null,
        },
      }))
    },
  },
}))

// Initialize listener to keep store in sync
supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.setState((state) => ({
    auth: {
      ...state.auth,
      session,
      user: session?.user ?? null,
      accessToken: session?.access_token ?? null,
      role: (session?.user?.app_metadata?.role as Role) ?? 'member',
      kelompok: (session?.user?.app_metadata?.kelompok as string) ?? null,
      isLoading: false,
    },
  }))
})
