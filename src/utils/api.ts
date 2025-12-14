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
 * Get lessons
 */
export async function getLessons() {
  try {
    const response = await fetch(`${API_BASE_URL}/lessons`)
    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Error:', response.status, errorText)
      throw new Error(`Failed to fetch lessons: ${response.status} ${errorText}`)
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

// Backward compatibility alias
export const getGrammarLessons = getLessons

/**
 * Get lesson by ID
 */
export async function getLesson(lessonId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/lessons/${lessonId}`)
    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Error:', response.status, errorText)
      throw new Error(`Failed to fetch lesson: ${response.status} ${errorText}`)
    }
    const data = await response.json()
    return data
  } catch (error: any) {
    console.error('Fetch error:', error)
    throw error
  }
}

// Backward compatibility alias
export const getGrammarLesson = getLesson

/**
 * Get lesson quiz by ID or lessonId
 */
export async function getLessonQuiz(quizIdOrLessonId: string, byLessonId: boolean = false) {
  let url = `${API_BASE_URL}/lessons/quizzes/${quizIdOrLessonId}`
  if (byLessonId) {
    url = `${API_BASE_URL}/lessons/quizzes/${quizIdOrLessonId}?lessonId=${quizIdOrLessonId}`
  }
  const response = await fetch(url)
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch lesson quiz: ${errorText}`)
  }
  return response.json()
}

// Backward compatibility alias
export const getGrammarQuiz = getLessonQuiz

/**
 * Get terms
 */
export async function getTerms(params?: { term?: string; level?: string }) {
  const queryParams = new URLSearchParams()
  if (params?.term) queryParams.append('term', params.term)
  if (params?.level) queryParams.append('level', params.level)
  
  const url = `${API_BASE_URL}/terms${queryParams.toString() ? '?' + queryParams.toString() : ''}`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch terms')
  return response.json()
}

/**
 * Get terms quiz by ID
 */
export async function getTermsQuiz(quizId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/terms/quizzes/${quizId}`)
    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Error:', response.status, errorText)
      throw new Error(`Failed to fetch terms quiz: ${response.status} ${errorText}`)
    }
    const data = await response.json()
    return data
  } catch (error: any) {
    console.error('Fetch error:', error)
    throw error
  }
}

/**
 * Get terms quizzes list
 */
export async function getTermsQuizzes(params?: { level?: string; category?: string }) {
  const queryParams = new URLSearchParams()
  if (params?.level) queryParams.append('level', params.level)
  if (params?.category) queryParams.append('category', params.category)
  
  const url = `${API_BASE_URL}/terms/quizzes${queryParams.toString() ? '?' + queryParams.toString() : ''}`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch terms quizzes')
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

export async function createTerm(term: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/admin/terms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(term),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create term: ${errorText}`)
  }

  return response.json()
}

export async function bulkUpload(type: 'lessons' | 'terms', items: any[]): Promise<any> {
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

export async function createLessonQuiz(quiz: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/admin/lessons/quiz`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(quiz),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create lesson quiz: ${errorText}`)
  }

  return response.json()
}

// Backward compatibility alias
export const createGrammarQuiz = createLessonQuiz

export async function createTermsQuiz(quiz: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/admin/terms/quiz`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(quiz),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create terms quiz: ${errorText}`)
  }

  return response.json()
}

export async function cleanupDuplicates(table: 'lessons' | 'terms'): Promise<any> {
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

/**
 * Level Management API
 */
export interface Level {
  levelId: string
  name: string
  description?: string
  order: number
  color?: string
  textColor?: string
}

export async function getLevels(): Promise<{ levels: Level[]; count: number }> {
  const response = await fetch(`${API_BASE_URL}/admin/levels`)
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch levels: ${errorText}`)
  }
  return response.json()
}

export async function createLevel(level: Omit<Level, 'levelId'>): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/admin/levels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(level),
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create level: ${errorText}`)
  }
  return response.json()
}

export async function updateLevel(levelId: string, level: Partial<Level>): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/admin/levels/${levelId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(level),
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to update level: ${errorText}`)
  }
  return response.json()
}

export async function deleteLevel(levelId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/admin/levels/${levelId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to delete level: ${errorText}`)
  }
  return response.json()
}

/**
 * Category Management API
 */
export interface Category {
  categoryId: string
  name: string
  description?: string
  icon?: string
  color?: string
  textColor?: string
}

export async function getCategories(): Promise<{ categories: Category[]; count: number }> {
  const response = await fetch(`${API_BASE_URL}/admin/categories`)
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch categories: ${errorText}`)
  }
  return response.json()
}

export async function createCategory(category: Omit<Category, 'categoryId'>): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/admin/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(category),
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create category: ${errorText}`)
  }
  return response.json()
}

export async function updateCategory(categoryId: string, category: Partial<Category>): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(category),
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to update category: ${errorText}`)
  }
  return response.json()
}

export async function deleteCategory(categoryId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to delete category: ${errorText}`)
  }
  return response.json()
}

/**
 * Image Upload API
 */
export async function getImageUploadUrl(fileName: string, fileType: string): Promise<{ uploadUrl: string; fileKey: string; fileUrl: string }> {
  const response = await fetch(`${API_BASE_URL}/admin/upload-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, fileType }),
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to get upload URL: ${errorText}`)
  }
  return response.json()
}

/**
 * App Configuration API
 */
export interface AppConfig {
  features: {
    lessons: boolean
    terms: boolean
    quizzes: boolean
  }
  termsType?: 'formulas' | 'memorizing'
}

export async function getAppConfig(): Promise<{ config: AppConfig }> {
  const response = await fetch(`${API_BASE_URL}/config`)
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch app config: ${errorText}`)
  }
  return response.json()
}

export async function updateAppConfig(config: AppConfig): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to update app config: ${errorText}`)
  }
  return response.json()
}

