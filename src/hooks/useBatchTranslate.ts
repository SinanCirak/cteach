import { useEffect, useState } from 'react'
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

  useEffect(() => {
    // Only translate if not English (source language)
    if (selectedLanguage.targetCode === 'en') {
      return
    }

    // Extract all words from texts
    const allWords = extractWordsFromTexts(texts)
    
    if (allWords.length === 0) {
      return
    }

    // Combine all texts for batch translation
    const combinedText = texts.join(' ')

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
  }, [texts.join(' '), selectedLanguage.targetCode]) // Re-run when texts or language changes

  return { isLoading, error }
}


