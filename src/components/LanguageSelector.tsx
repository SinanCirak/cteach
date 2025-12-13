import { useState, useRef, useEffect } from 'react'
import ReactCountryFlag from 'react-country-flag'
import { useLanguage, languages } from '../contexts/LanguageContext'

export default function LanguageSelector() {
  const { selectedLanguage, setSelectedLanguage } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:border-primary-300 hover:bg-gray-50 transition-colors shadow-sm"
        aria-label="Select language"
      >
        <ReactCountryFlag
          countryCode={selectedLanguage.countryCode}
          svg
          style={{
            width: '20px',
            height: '15px',
          }}
          title={selectedLanguage.name}
        />
        <span className="text-sm font-medium text-gray-700 hidden sm:inline">
          {selectedLanguage.name}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => {
                setSelectedLanguage(language)
                setIsOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-primary-50 transition-colors ${
                selectedLanguage.code === language.code ? 'bg-primary-50 text-primary-600' : 'text-gray-700'
              }`}
            >
              <ReactCountryFlag
                countryCode={language.countryCode}
                svg
                style={{
                  width: '24px',
                  height: '18px',
                }}
                title={language.name}
                className="flex-shrink-0"
              />
              <span className="font-medium text-sm flex-1">{language.name}</span>
              {selectedLanguage.code === language.code && (
                <svg className="w-4 h-4 ml-auto text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

