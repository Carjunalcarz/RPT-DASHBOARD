import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Re-export auth store
export { useAuthStore, type User, type AuthState } from './authStore'
export { useAccountingHierarchyStore } from './accountingHierarchyStore'

// Settings store using Zustand
export type NavigationUIType = 'desktop' | 'sidebar'
export type DockStyleType = 'compact' | 'comfortable' | 'expanded'

interface SettingsState {
  darkMode: boolean
  compactMode: boolean
  fontSize: 'small' | 'medium' | 'large'
  tableDensity: 'comfortable' | 'standard' | 'compact'
  autoLogout: boolean
  highContrast: boolean
  reducedMotion: boolean
  sidebarCollapsed: boolean
  systemLogo: string | null
  systemLogoPath: string | null
  sidebarOrder: Record<string, string[]> // category -> ordered item ids
  sidebarSectionOrder: string[] // ordered section titles
  navigationUI: NavigationUIType
  dockStyle: DockStyleType
  recentApps: string[]
  favoriteApps: string[]
  setDarkMode: (value: boolean) => void
  setCompactMode: (value: boolean) => void
  setFontSize: (value: 'small' | 'medium' | 'large') => void
  setTableDensity: (value: 'comfortable' | 'standard' | 'compact') => void
  setAutoLogout: (value: boolean) => void
  setHighContrast: (value: boolean) => void
  setReducedMotion: (value: boolean) => void
  setSidebarCollapsed: (value: boolean) => void
  setSystemLogo: (url: string | null, path?: string | null) => void
  setSidebarOrder: (order: Record<string, string[]>) => void
  setSidebarSectionOrder: (order: string[]) => void
  resetSidebarOrder: () => void
  setNavigationUI: (value: NavigationUIType) => void
  setDockStyle: (value: DockStyleType) => void
  addRecentApp: (appId: string) => void
  toggleFavoriteApp: (appId: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      darkMode: false,
      compactMode: false,
      fontSize: 'medium',
      tableDensity: 'standard',
      autoLogout: false,
      highContrast: false,
      reducedMotion: false,
      sidebarCollapsed: false,
      systemLogo: null,
      systemLogoPath: null,
      sidebarOrder: {},
      sidebarSectionOrder: [],
      navigationUI: 'desktop',
      dockStyle: 'comfortable',
      recentApps: [],
      favoriteApps: [],
      setDarkMode: (value) => set({ darkMode: value }),
      setCompactMode: (value) => set({ compactMode: value }),
      setFontSize: (value) => set({ fontSize: value }),
      setTableDensity: (value) => set({ tableDensity: value }),
      setAutoLogout: (value) => set({ autoLogout: value }),
      setHighContrast: (value) => set({ highContrast: value }),
      setReducedMotion: (value) => set({ reducedMotion: value }),
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
      setSystemLogo: (url, path) => set({ systemLogo: url, systemLogoPath: path ?? null }),
      setSidebarOrder: (order) => set({ sidebarOrder: order }),
      setSidebarSectionOrder: (order) => set({ sidebarSectionOrder: order }),
      resetSidebarOrder: () => set({ sidebarOrder: {}, sidebarSectionOrder: [] }),
      setNavigationUI: (value) => set({ navigationUI: value }),
      setDockStyle: (value) => set({ dockStyle: value }),
      addRecentApp: (appId) =>
        set((state) => {
          const filtered = state.recentApps.filter((id) => id !== appId)
          return { recentApps: [appId, ...filtered].slice(0, 10) }
        }),
      toggleFavoriteApp: (appId) =>
        set((state) => {
          const isFavorite = state.favoriteApps.includes(appId)
          return {
            favoriteApps: isFavorite
              ? state.favoriteApps.filter((id) => id !== appId)
              : [...state.favoriteApps, appId],
          }
        }),
    }),
    {
      name: 'settings-storage',
    }
  )
)
