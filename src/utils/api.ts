// API configuration
// Use direct API Gateway URL for now (CORS is configured)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://fi3hva7yre.execute-api.ca-central-1.amazonaws.com/prod'

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

    // Check if response is JSON
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      console.error('Non-JSON response:', text.substring(0, 200))
      throw new Error(`Translation failed: Server returned non-JSON response (${response.status})`)
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(errorData.error || `Translation failed: ${response.statusText}`)
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
  try {
    const response = await fetch(`${API_BASE_URL}/grammar/lessons`)
    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Error:', response.status, errorText)
      throw new Error(`Failed to fetch grammar lessons: ${response.status} ${errorText}`)
    }
    const data = await response.json()
    return data
  } catch (error: any) {
    console.error('Fetch error:', error)
    // If it's a network error, return empty array instead of throwing
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      console.warn('Network error, returning empty lessons array')
      return { lessons: [] }
    }
    throw error
  }
}

/**
 * Get grammar lesson by ID
 */
export async function getGrammarLesson(lessonId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/grammar/lessons/${lessonId}`)
    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Error:', response.status, errorText)
      throw new Error(`Failed to fetch grammar lesson: ${response.status} ${errorText}`)
    }
    const data = await response.json()
    return data
  } catch (error: any) {
    console.error('Fetch error:', error)
    throw error
  }
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
 * Get vocabulary quiz by ID
 */
export async function getVocabularyQuiz(quizId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/vocabulary/quizzes/${quizId}`)
    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Error:', response.status, errorText)
      throw new Error(`Failed to fetch vocabulary quiz: ${response.status} ${errorText}`)
    }
    const data = await response.json()
    return data
  } catch (error: any) {
    console.error('Fetch error:', error)
    throw error
  }
}

/**
 * Get vocabulary quizzes list
 */
export async function getVocabularyQuizzes(params?: { level?: string; category?: string }) {
  const queryParams = new URLSearchParams()
  if (params?.level) queryParams.append('level', params.level)
  if (params?.category) queryParams.append('category', params.category)
  
  const url = `${API_BASE_URL}/vocabulary/quizzes${queryParams.toString() ? '?' + queryParams.toString() : ''}`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch vocabulary quizzes')
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

/**
 * Admin API functions
 */
export async function createGrammarLesson(lesson: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/admin/grammar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(lesson),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create grammar lesson: ${errorText}`)
  }

  return response.json()
}

export async function createVocabularyWord(word: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/admin/vocabulary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(word),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create vocabulary word: ${errorText}`)
  }

  return response.json()
}

export async function bulkUpload(type: 'grammar_lessons' | 'vocabulary_words', items: any[]): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/admin/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, items }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to bulk upload: ${errorText}`)
  }

  return response.json()
}

export async function createGrammarQuiz(quiz: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/admin/grammar/quiz`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(quiz),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create grammar quiz: ${errorText}`)
  }

  return response.json()
}

export async function createVocabularyQuiz(quiz: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/admin/vocabulary/quiz`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(quiz),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create vocabulary quiz: ${errorText}`)
  }

  return response.json()
}

export async function cleanupDuplicates(table: 'grammar_lessons' | 'vocabulary_words'): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/admin/cleanup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ table }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to cleanup duplicates: ${errorText}`)
  }

  return response.json()
}

