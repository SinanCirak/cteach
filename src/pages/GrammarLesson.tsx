import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import ClickableText from '../components/ClickableText'
import { getGrammarLesson } from '../utils/api'

interface Lesson {
  lessonId: string
  title: string
  subtitle: string
  content: string[]
  formula?: string
  uses: { icon: string; title: string; description: string; example: string }[]
  examples: { sentence: string; explanation: string }[]
  tips?: string[]
  [key: string]: any // Allow any additional fields like pronouns, forms, etc.
}

export default function GrammarLesson() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLesson = async () => {
      if (!lessonId) return
      
      try {
        setLoading(true)
        const data = await getGrammarLesson(lessonId)
        console.log('Fetched lesson data:', data)
        
        // Ensure all required fields have default values
        if (data) {
          // Get all fields from data, including dynamic ones
          const lessonData: any = {
            lessonId: data.lessonId || lessonId,
            title: data.title || 'Untitled Lesson',
            subtitle: data.subtitle || '',
            content: Array.isArray(data.content) ? data.content : [],
            formula: data.formula || '',
            uses: Array.isArray(data.uses) ? data.uses : [],
            examples: Array.isArray(data.examples) ? data.examples : [],
            tips: Array.isArray(data.tips) ? data.tips : [],
          }
          
          // Add all other dynamic fields (pronouns, forms, etc.)
          Object.keys(data).forEach(key => {
            if (!['lessonId', 'title', 'subtitle', 'content', 'formula', 'uses', 'examples', 'tips', 'level', 'order', 'createdAt', 'updatedAt'].includes(key)) {
              lessonData[key] = data[key]
            }
          })
          
          setLesson(lessonData)
        } else {
          setError('Lesson data is empty')
        }
      } catch (err: any) {
        console.error('Failed to fetch lesson:', err)
        setError(err.message || 'Failed to load lesson')
      } finally {
        setLoading(false)
      }
    }

    fetchLesson()
  }, [lessonId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lesson...</p>
        </div>
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{error || 'Lesson not found'}</h2>
        <Link to="/grammar" className="text-primary-600 hover:underline">
          Back to Grammar Lessons
        </Link>
      </div>
    )
  }


  // Batch translation disabled temporarily to fix infinite loop issue
  // Will be re-enabled after fixing the useBatchTranslate hook

  if (!lesson) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Lesson not found</h2>
        <Link to="/grammar" className="text-primary-600 hover:underline">
          Back to Grammar Lessons
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
      {/* Back Button */}
      <Link
        to="/grammar"
        className="inline-flex items-center text-sm sm:text-base text-gray-600 hover:text-primary-600 transition-colors group"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Lessons
      </Link>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3">{lesson.title}</h1>
            <p className="text-base sm:text-lg md:text-xl text-primary-100">{lesson.subtitle}</p>
          </div>
          <div className="hidden md:block w-20 h-20 lg:w-24 lg:h-24 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-10 h-10 lg:w-12 lg:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>
      </div>

      {/* Introduction */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-primary-500">
        <div className="flex items-start">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="space-y-2 sm:space-y-3 flex-1">
            {Array.isArray(lesson.content) && lesson.content.length > 0 ? (
              lesson.content.map((paragraph, index) => (
                <p key={index} className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))
            ) : (
              <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed">
                No content available for this lesson.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Formula Section */}
      {lesson.formula && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6 border-2 border-purple-200">
          <div className="flex items-center mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Formula</h2>
          </div>
          <div className="bg-white rounded-lg p-3 sm:p-4 border-2 border-purple-300 overflow-x-auto">
            <code className="text-lg sm:text-xl md:text-2xl font-mono font-bold text-purple-700 whitespace-nowrap">{lesson.formula}</code>
          </div>
        </div>
      )}

      {/* Uses Section */}
      {Array.isArray(lesson.uses) && lesson.uses.length > 0 && (
        <div>
          <div className="flex items-center mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">When to Use</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            {lesson.uses.map((use, index) => (
            <div
              key={index}
              className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow border border-gray-100 group"
            >
              <div className="flex items-start">
                <div className="text-3xl sm:text-4xl mr-3 sm:mr-4 group-hover:scale-110 transition-transform flex-shrink-0">{use.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{use.title}</h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-3">{use.description}</p>
                  <div className="bg-primary-50 rounded-lg p-2 sm:p-3 border-l-4 border-primary-500">
                    <p className="text-sm sm:text-base text-gray-800 font-medium italic">
                      "<ClickableText text={use.example} />"
                    </p>
                  </div>
                </div>
              </div>
            </div>
            ))}
          </div>
        </div>
      )}

      {/* Examples Section */}
      {Array.isArray(lesson.examples) && lesson.examples.length > 0 && (
        <div>
          <div className="flex items-center mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Examples</h2>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {lesson.examples.map((example, index) => (
            <div
              key={index}
              className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg sm:rounded-xl p-4 sm:p-6 border-l-4 border-primary-500 shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold mr-3 sm:mr-4 flex-shrink-0 text-sm sm:text-base">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-2 sm:mb-3 italic">
                    "<ClickableText text={example.sentence} />"
                  </p>
                  <div className="flex items-start">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm sm:text-base text-gray-700">{example.explanation}</p>
                  </div>
                </div>
              </div>
            </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Content Sections */}
      {(() => {
        // Known fields that have special rendering
        const knownFields = ['content', 'formula', 'uses', 'examples', 'tips', 'lessonId', 'title', 'subtitle', 'level', 'order', 'createdAt', 'updatedAt']
        
        // Get all dynamic fields (not in knownFields)
        const dynamicFields = Object.keys(lesson).filter(key => !knownFields.includes(key))
        
        return dynamicFields.map(fieldName => {
          const fieldValue = lesson[fieldName]
          
          // Skip if not an array or empty
          if (!Array.isArray(fieldValue) || fieldValue.length === 0) {
            return null
          }
          
          // Determine field type based on first item structure
          const firstItem = fieldValue[0]
          const isObject = typeof firstItem === 'object' && firstItem !== null
          
          // Capitalize field name for display
          const displayName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1')
          
          // Color scheme based on field name
          const getColorScheme = (name: string) => {
            const lower = name.toLowerCase()
            if (lower.includes('pronoun')) return { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-500' }
            if (lower.includes('form')) return { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-500' }
            if (lower.includes('verb')) return { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-500' }
            if (lower.includes('noun')) return { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-500' }
            return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-500' }
          }
          
          const colors = getColorScheme(fieldName)
          
          return (
            <div key={fieldName}>
              <div className="flex items-center mb-4 sm:mb-6">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 ${colors.bg} rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0`}>
                  <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10m-7 4h7" />
                  </svg>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{displayName}</h2>
              </div>
              
              {isObject ? (
                // Render array of objects (like pronouns, forms, etc.)
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {fieldValue.map((item: any, index: number) => {
                    // Find key names (not values) for common properties
                    const allKeys = Object.keys(item)
                    const mainKey = allKeys.find(k => ['pronoun', 'form', 'word', 'name', 'title', 'subject', 'rule'].includes(k)) || allKeys[0]
                    const meaningKey = allKeys.find(k => ['meaning', 'description', 'definition', 'use'].includes(k))
                    const exampleKey = allKeys.find(k => ['example', 'sentence'].includes(k))
                    
                    return (
                      <div
                        key={index}
                        className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow border border-gray-100"
                      >
                        {mainKey && item[mainKey] && (
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-xl sm:text-2xl font-bold text-primary-600">{item[mainKey]}</h3>
                          </div>
                        )}
                        {meaningKey && item[meaningKey] && (
                          <p className="text-sm sm:text-base text-gray-600 mb-3">
                            <span className="font-semibold text-gray-800 capitalize">{meaningKey}: </span>
                            {item[meaningKey]}
                          </p>
                        )}
                        {exampleKey && item[exampleKey] && (
                          <div className={`bg-primary-50 rounded-lg p-2 sm:p-3 border-l-4 ${colors.border}`}>
                            <p className="text-sm sm:text-base text-gray-800 font-medium italic">
                              "<ClickableText text={item[exampleKey]} />"
                            </p>
                          </div>
                        )}
                        {/* Render any remaining properties that weren't shown above */}
                        {(() => {
                          const shownKeys = [mainKey, meaningKey, exampleKey].filter(Boolean)
                          const remainingKeys = allKeys.filter(k => !shownKeys.includes(k))
                          if (remainingKeys.length === 0) return null
                          return (
                            <div className="space-y-2 mt-3">
                              {remainingKeys.map((key) => (
                                <div key={key}>
                                  <span className="font-semibold text-gray-800 capitalize">{key}: </span>
                                  <span className="text-gray-600">
                                    {typeof item[key] === 'string' ? (
                                      key.toLowerCase().includes('example') || key.toLowerCase().includes('sentence') ? (
                                        <ClickableText text={item[key]} />
                                      ) : (
                                        item[key]
                                      )
                                    ) : (
                                      JSON.stringify(item[key])
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })}
                </div>
              ) : (
                // Render array of strings
                <div className="space-y-2 sm:space-y-3">
                  {fieldValue.map((item: string, index: number) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6 border border-gray-100"
                    >
                      <p className="text-sm sm:text-base text-gray-800">
                        <ClickableText text={item} />
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })
      })()}

      {/* Tips Section */}
      {Array.isArray(lesson.tips) && lesson.tips.length > 0 && (
        <div className="bg-yellow-50 rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6 border-2 border-yellow-200">
          <div className="flex items-center mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-500 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">💡 Pro Tips</h2>
          </div>
          <ul className="space-y-2 sm:space-y-3">
            {lesson.tips.map((tip, index) => (
              <li key={index} className="flex items-start">
                <span className="text-yellow-600 mr-2 sm:mr-3 font-bold flex-shrink-0">✓</span>
                <span className="text-sm sm:text-base text-gray-800">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 md:p-8 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="mb-4 md:mb-0 text-center md:text-left">
            <h3 className="text-xl sm:text-2xl font-bold mb-2">Ready to test your knowledge?</h3>
            <p className="text-sm sm:text-base text-primary-100">Take the quiz to see how well you understand this lesson</p>
          </div>
          <Link
            to={`/grammar/${lessonId}/quiz`}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-primary-600 rounded-lg font-bold hover:bg-primary-50 transition-colors shadow-lg hover:shadow-xl flex items-center justify-center group whitespace-nowrap w-full md:w-auto"
          >
            Take Quiz
            <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
