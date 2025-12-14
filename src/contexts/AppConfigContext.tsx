import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getAppConfig, type AppConfig } from '../utils/api'

interface AppConfigContextType {
  config: AppConfig | null
  loading: boolean
  refresh: () => Promise<void>
}

const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined)

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const loadConfig = async () => {
    try {
      setLoading(true)
      const data = await getAppConfig()
      if (data && data.config) {
        setConfig(data.config)
      } else {
        // Default config
        setConfig({
          features: { lessons: true, terms: false, quizzes: true },
          termsType: 'formulas'
        })
      }
    } catch (error) {
      console.error('Failed to load app config:', error)
      // Default config on error
      setConfig({
        features: { lessons: true, terms: false, quizzes: true },
        termsType: 'formulas'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  return (
    <AppConfigContext.Provider value={{ config, loading, refresh: loadConfig }}>
      {children}
    </AppConfigContext.Provider>
  )
}

export function useAppConfig() {
  const context = useContext(AppConfigContext)
  if (context === undefined) {
    throw new Error('useAppConfig must be used within an AppConfigProvider')
  }
  return context
}

