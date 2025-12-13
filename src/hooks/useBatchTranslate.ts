import { useEffect, useState, useRef } from 'react'
import { batchTranslate } from '../utils/api'
import { extractWordsFromTexts } from '../utils/textExtractor'
import { useLanguage } from '../contexts/LanguageContext'

/**
 * Hook to batch translate words from multiple text strings
 */
export function useBatchTranslate(texts: string[]) {
  const { selectedLanguage } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const previousTextsRef = useRef<string>('')
  const previousLanguageRef = useRef<string>('')

  useEffect(() => {
    // Only translate if not English (source language)
    if (selectedLanguage.targetCode === 'en') {
      return
    }

    // Create a stable key from texts array
    const textsKey = JSON.stringify(texts || [])
    const languageKey = selectedLanguage.targetCode

    // Skip if texts and language haven't changed
    if (textsKey === previousTextsRef.current && languageKey === previousLanguageRef.current) {
      return
    }

    // Update refs
    previousTextsRef.current = textsKey
    previousLanguageRef.current = languageKey

    // Extract all words from texts
    const allWords = extractWordsFromTexts(texts || [])
    
    if (allWords.length === 0) {
      return
    }

    // Combine all texts for batch translation
    const combinedText = (texts || []).join(' ')

    setIsLoading(true)
    setError(null)

    batchTranslate(combinedText, selectedLanguage.targetCode)
      .then((result) => {
        console.log(`Batch translated ${result.translated} words, ${result.cached} from cache`)
      })
      .catch((err) => {
        console.error('Batch translation error:', err)
        setError(err.message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [texts, selectedLanguage.targetCode]) // Keep dependencies but use refs to prevent infinite loops

  return { isLoading, error }
}


