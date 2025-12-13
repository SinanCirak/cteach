import { createContext, useContext, useState, ReactNode } from 'react'

export type Language = {
  code: string
  name: string
  countryCode: string // ISO 3166-1 alpha-2 country code for flag
  targetCode: string // AWS Translate language code
}

export const languages: Language[] = [
  // Canada's official languages
  { code: 'en', name: 'English', countryCode: 'CA', targetCode: 'en' },
  { code: 'fr', name: 'Français', countryCode: 'FR', targetCode: 'fr' },
  // Most spoken immigrant languages in Canada
  { code: 'zh', name: '中文 (Mandarin)', countryCode: 'CN', targetCode: 'zh' },
  { code: 'es', name: 'Español', countryCode: 'ES', targetCode: 'es' },
  { code: 'it', name: 'Italiano', countryCode: 'IT', targetCode: 'it' },
  { code: 'de', name: 'Deutsch', countryCode: 'DE', targetCode: 'de' },
  { code: 'ar', name: 'العربية', countryCode: 'SA', targetCode: 'ar' },
  { code: 'pt', name: 'Português', countryCode: 'PT', targetCode: 'pt' },
  { code: 'hi', name: 'हिन्दी', countryCode: 'IN', targetCode: 'hi' },
  { code: 'tr', name: 'Türkçe', countryCode: 'TR', targetCode: 'tr' },
  { code: 'pl', name: 'Polski', countryCode: 'PL', targetCode: 'pl' },
  { code: 'uk', name: 'Українська', countryCode: 'UA', targetCode: 'uk' },
]

interface LanguageContextType {
  selectedLanguage: Language
  setSelectedLanguage: (language: Language) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(() => {
    // Load from localStorage or default to English (Canada's primary language)
    const saved = localStorage.getItem('tilgo-language')
    if (saved) {
      const lang = languages.find(l => l.code === saved)
      if (lang) return lang
    }
    return languages[0] // Default: English (Canada)
  })

  const handleSetLanguage = (language: Language) => {
    setSelectedLanguage(language)
    localStorage.setItem('tilgo-language', language.code)
  }

  return (
    <LanguageContext.Provider value={{ selectedLanguage, setSelectedLanguage: handleSetLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

