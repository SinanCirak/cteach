import { useState, useRef, useEffect, useMemo } from 'react'
import { translateWord } from '../utils/api'
import { useLanguage } from '../contexts/LanguageContext'
import { useTooltip } from '../contexts/TooltipContext'

interface WordTooltipProps {
  word: string
  children: React.ReactNode
}

// Global counter for unique IDs
let globalIdCounter = 0

export default function WordTooltip({ word, children }: WordTooltipProps) {
  const { selectedLanguage } = useLanguage()
  const { activeTooltip, setActiveTooltip } = useTooltip()
  const [translation, setTranslation] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wordRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  
  // Generate truly unique ID for this component instance
  const uniqueId = useMemo(() => {
    return `tooltip_${++globalIdCounter}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])
  
  const normalizedWord = word.toLowerCase().trim().replace(/[.,!?;:()"]/g, '')
  const showTooltip = activeTooltip === uniqueId

  // Close tooltip when another one opens
  useEffect(() => {
    if (activeTooltip && activeTooltip !== uniqueId) {
      setTranslation(null)
      setError(null)
    }
  }, [activeTooltip, uniqueId])

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    console.log('WordTooltip clicked:', word, 'activeTooltip:', activeTooltip)
    
    // Toggle tooltip
    if (showTooltip) {
      setActiveTooltip(null)
      return
    }
    
    // Close any other open tooltip and open this one (using uniqueId for uniqueness)
    setActiveTooltip(uniqueId)
    setLoading(true)
    setError(null)
    setTranslation(null)
    
    try {
      console.log('Normalized word:', normalizedWord, 'Target language:', selectedLanguage.targetCode)
      
      if (normalizedWord) {
        // Only translate if target language is not English (source language)
        if (selectedLanguage.targetCode !== 'en') {
          console.log('Calling translateWord API...')
          const result = await translateWord(normalizedWord, selectedLanguage.targetCode)
          console.log('Translation result:', result)
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
  }

  useEffect(() => {
    if (!showTooltip) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      
      // Don't close if clicking on the word or tooltip
      if (
        (wordRef.current && wordRef.current.contains(target)) ||
        (tooltipRef.current && tooltipRef.current.contains(target))
      ) {
        return
      }
      
      // Close tooltip if clicking outside
      setActiveTooltip(null)
    }

    // Use a small delay to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showTooltip])

  return (
    <span
      ref={wordRef}
      onClick={handleClick}
      onMouseDown={(e) => e.stopPropagation()}
      className="cursor-pointer hover:text-primary-600 hover:underline transition-colors relative inline-block"
      style={{ textDecoration: showTooltip ? 'underline' : 'none' }}
    >
      {children}
      {showTooltip && (
        <div
          ref={tooltipRef}
          className="absolute z-[9999] bg-white rounded-lg shadow-xl border-2 border-primary-200 p-3 min-w-[150px] max-w-[250px]"
          style={{
            top: '100%',
            left: '100%',
            marginTop: '5px',
            marginLeft: '5px',
            animation: 'fadeIn 0.2s ease-in-out',
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="font-bold text-primary-600 text-sm">{word}</div>
            <button
              onClick={() => setActiveTooltip(null)}
              className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0"
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
              <div className="break-words">{translation}</div>
            )}
            {!loading && !error && !translation && (
              <div className="text-gray-500 text-xs">No translation available</div>
            )}
          </div>
        </div>
      )}
    </span>
  )
}
