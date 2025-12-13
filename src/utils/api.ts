// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.tilgo.cirak.ca/prod'

export interface TranslationResponse {
  word: string
  translation: string
  source: 'cache' | 'aws-translate'
}

export interface BatchTranslationResponse {
  translations: TranslationResponse[]
  totalWords: number
  cached: number
  translated: number
}

/**
 * Translate a word using AWS Translate API
 */
export async function translateWord(word: string, targetLanguage: string = 'tr'): Promise<TranslationResponse> {
  const normalizedWord = word.toLowerCase().trim().replace(/[.,!?;:()"]/g, '')
  
  if (!normalizedWord) {
    throw new Error('Invalid word')
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/translate/${encodeURIComponent(normalizedWord)}?target=${encodeURIComponent(targetLanguage)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Translation failed: ${response.statusText}`)
    }

    const data: TranslationResponse = await response.json()
    return data
  } catch (error) {
    console.error('Translation error:', error)
    throw error
  }
}

/**
 * Get grammar lessons
 */
export async function getGrammarLessons() {
  const response = await fetch(`${API_BASE_URL}/grammar/lessons`)
  if (!response.ok) throw new Error('Failed to fetch grammar lessons')
  return response.json()
}

/**
 * Get grammar lesson by ID
 */
export async function getGrammarLesson(lessonId: string) {
  const response = await fetch(`${API_BASE_URL}/grammar/lessons/${lessonId}`)
  if (!response.ok) throw new Error('Failed to fetch grammar lesson')
  return response.json()
}

/**
 * Get grammar quiz by ID
 */
export async function getGrammarQuiz(quizId: string) {
  const response = await fetch(`${API_BASE_URL}/grammar/quizzes/${quizId}`)
  if (!response.ok) throw new Error('Failed to fetch grammar quiz')
  return response.json()
}

/**
 * Get vocabulary words
 */
export async function getVocabularyWords(params?: { word?: string; level?: string }) {
  const queryParams = new URLSearchParams()
  if (params?.word) queryParams.append('word', params.word)
  if (params?.level) queryParams.append('level', params.level)
  
  const url = `${API_BASE_URL}/vocabulary/words${queryParams.toString() ? '?' + queryParams.toString() : ''}`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch vocabulary words')
  return response.json()
}

/**
 * Batch translate words from text
 */
export async function batchTranslate(text: string, targetLanguage: string = 'tr'): Promise<BatchTranslationResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/translate/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        targetLanguage,
      }),
    })

    if (!response.ok) {
      throw new Error(`Batch translation failed: ${response.statusText}`)
    }

    const data: BatchTranslationResponse = await response.json()
    return data
  } catch (error) {
    console.error('Batch translation error:', error)
    throw error
  }
}

