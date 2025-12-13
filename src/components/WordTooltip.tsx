import { useState, useRef, useEffect } from 'react'
import { translateWord } from '../utils/api'
import { useLanguage } from '../contexts/LanguageContext'

interface WordTooltipProps {
  word: string
  children: React.ReactNode
}

export default function WordTooltip({ word, children }: WordTooltipProps) {
  const { selectedLanguage } = useLanguage()
  const [showTooltip, setShowTooltip] = useState(false)
  const [translation, setTranslation] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const wordRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showTooltip && wordRef.current) {
      const rect = wordRef.current.getBoundingClientRect()
      const tooltipHeight = tooltipRef.current?.offsetHeight || 80
      const tooltipWidth = tooltipRef.current?.offsetWidth || 200
      
      let top = rect.bottom + window.scrollY + 8
      let left = rect.left + rect.width / 2 - tooltipWidth / 2 + window.scrollX

      // Adjust if tooltip goes off screen horizontally
      if (left < 10) left = 10
      if (left + tooltipWidth > window.innerWidth - 10) {
        left = window.innerWidth - tooltipWidth - 10
      }

      // If tooltip would go below viewport, show above
      const viewportBottom = window.scrollY + window.innerHeight
      if (top + tooltipHeight > viewportBottom - 10) {
        top = rect.top + window.scrollY - tooltipHeight - 8
      }

      setPosition({ top, left })
    }
  }, [showTooltip, translation])

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    
    if (!showTooltip) {
      setShowTooltip(true)
      setLoading(true)
      setError(null)
      
      try {
        const normalizedWord = word.toLowerCase().trim().replace(/[.,!?;:()"]/g, '')
        if (normalizedWord) {
          // Only translate if target language is not English (source language)
          if (selectedLanguage.targetCode !== 'en') {
            const result = await translateWord(normalizedWord, selectedLanguage.targetCode)
            setTranslation(result.translation)
          } else {
            // If English is selected, show the word itself
            setTranslation(normalizedWord)
          }
        } else {
          setError('Invalid word')
        }
      } catch (err) {
        console.error('Translation error:', err)
        setError('Translation failed')
        setTranslation(null)
      } finally {
        setLoading(false)
      }
    } else {
      setShowTooltip(false)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        wordRef.current &&
        !wordRef.current.contains(event.target as Node)
      ) {
        setShowTooltip(false)
      }
    }

    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showTooltip])

  return (
    <>
      <span
        ref={wordRef}
        onClick={handleClick}
        className="cursor-pointer hover:text-primary-600 hover:underline transition-colors relative inline-block"
        style={{ textDecoration: showTooltip ? 'underline' : 'none' }}
      >
        {children}
      </span>
      {showTooltip && (
        <div
          ref={tooltipRef}
          className="fixed z-50 bg-white rounded-lg shadow-xl border-2 border-primary-200 p-3 min-w-[150px] max-w-[250px] animate-in fade-in slide-in-from-top-1 duration-200"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="font-bold text-primary-600 text-sm">{word}</div>
            <button
              onClick={() => setShowTooltip(false)}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="text-gray-800 text-sm font-medium border-t border-gray-200 pt-2">
            {loading && (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-gray-500">Translating...</span>
              </div>
            )}
            {error && (
              <div className="text-red-600 text-xs">{error}</div>
            )}
            {!loading && !error && translation && (
              <div>{translation}</div>
            )}
          </div>
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-l-2 border-t-2 border-primary-200 rotate-45"></div>
        </div>
      )}
    </>
  )
}
