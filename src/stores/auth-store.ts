import { create } from 'zustand'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  auth: {
    user: User | null
    session: Session | null
    accessToken: string | null
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
    isLoading: true,
    checkSession: async () => {
      try {
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
            isLoading: false,
          },
        }))
      } catch (error) {
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
      isLoading: false,
    },
  }))
})
