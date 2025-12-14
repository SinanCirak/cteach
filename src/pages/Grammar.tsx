import { Link } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { getGrammarLessons } from '../utils/api'

interface GrammarLesson {
  lessonId: string
  title: string
  subtitle?: string
  level: string
  order: number
}

type LevelFilter = 'all' | 'beginner' | 'elementary' | 'intermediate' | 'upper-intermediate' | 'advanced'

export default function Grammar() {
  const [lessons, setLessons] = useState<GrammarLesson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<LevelFilter>('all')

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        setLoading(true)
        const data = await getGrammarLessons()
        if (data && data.lessons) {
          // Remove duplicates based on lessonId
          const uniqueLessons = data.lessons.reduce((acc: GrammarLesson[], lesson: GrammarLesson) => {
            if (!acc.find(l => l.lessonId === lesson.lessonId)) {
              acc.push(lesson)
            }
            return acc
          }, [])
          
          // Sort by order
          const sortedLessons = uniqueLessons.sort((a: GrammarLesson, b: GrammarLesson) => 
            (a.order || 0) - (b.order || 0)
          )
          setLessons(sortedLessons)
        }
      } catch (err: any) {
        console.error('Failed to fetch lessons:', err)
        // If no lessons found, show empty state instead of error
        if (err.message && err.message.includes('404')) {
          setLessons([])
          setError(null)
        } else {
          setError(err.message || 'Failed to load lessons')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchLessons()
  }, [])

  // Filter and group lessons by level
  const filteredAndGroupedLessons = useMemo(() => {
    const filtered = selectedLevel === 'all' 
      ? lessons 
      : lessons.filter(lesson => lesson.level.toLowerCase() === selectedLevel.toLowerCase())

    // Group by level
    const grouped: Record<string, GrammarLesson[]> = {
      beginner: [],
      elementary: [],
      intermediate: [],
      'upper-intermediate': [],
      advanced: []
    }

    filtered.forEach(lesson => {
      const level = lesson.level.toLowerCase()
      if (level === 'beginner') {
        grouped.beginner.push(lesson)
      } else if (level === 'elementary') {
        grouped.elementary.push(lesson)
      } else if (level === 'intermediate') {
        grouped.intermediate.push(lesson)
      } else if (level === 'upper-intermediate' || level === 'upperintermediate') {
        grouped['upper-intermediate'].push(lesson)
      } else if (level === 'advanced') {
        grouped.advanced.push(lesson)
      }
    })

    // Sort each group by order
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => (a.order || 0) - (b.order || 0))
    })

    return grouped
  }, [lessons, selectedLevel])


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lessons...</p>
        </div>
      </div>
    )
  }

  if (error && lessons.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <p className="text-gray-600 mb-4 text-sm">
          API URL: {import.meta.env.VITE_API_URL || 'https://fi3hva7yre.execute-api.ca-central-1.amazonaws.com/prod'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="text-primary-600 hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (lessons.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No lessons found</h2>
        <p className="text-gray-600 mb-4">
          Please upload grammar lessons from the admin panel.
        </p>
        <Link
          to="/admin"
          className="text-primary-600 hover:underline"
        >
          Go to Admin Panel
        </Link>
      </div>
    )
  }

  const levelButtons: { value: LevelFilter; label: string }[] = [
    { value: 'all', label: 'All Levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'elementary', label: 'Elementary' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'upper-intermediate', label: 'Upper Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ]

  const hasLessons = Object.values(filteredAndGroupedLessons).some(group => group.length > 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Grammar Lessons</h1>
        <p className="text-lg text-gray-600">
          Master English grammar step by step with interactive lessons and quizzes
        </p>
      </div>

      {/* Level Filter Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        {levelButtons.map((button) => (
          <button
            key={button.value}
            onClick={() => setSelectedLevel(button.value)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
              selectedLevel === button.value
                ? 'bg-primary-600 text-white shadow-md scale-105'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-primary-300 hover:bg-primary-50'
            }`}
          >
            {button.label}
          </button>
        ))}
      </div>

      {!hasLessons ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-600">No lessons found for the selected level.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Beginner Section */}
          {filteredAndGroupedLessons.beginner.length > 0 && (
            <div id="beginner-section">
              <div className="flex items-center mb-6">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                <h2 className="px-6 text-2xl font-bold text-gray-900 flex items-center">
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700 mr-3">
                    Beginner
                  </span>
                  Level
                </h2>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndGroupedLessons.beginner.map((lesson) => (
                  <Link
                    key={lesson.lessonId}
                    to={`/grammar/${lesson.lessonId}`}
                    className="group bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          Beginner
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                        {lesson.title}
                      </h3>
                      <p className="text-gray-600 mb-4 text-sm">{lesson.subtitle || `Learn about ${lesson.title}`}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-500">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          15 min
                        </div>
                        <div className="flex items-center text-primary-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                          Start
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Elementary Section */}
          {filteredAndGroupedLessons.elementary.length > 0 && (
            <div id="elementary-section">
              <div className="flex items-center mb-6">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                <h2 className="px-6 text-2xl font-bold text-gray-900 flex items-center">
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-teal-100 text-teal-700 mr-3">
                    Elementary
                  </span>
                  Level
                </h2>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndGroupedLessons.elementary.map((lesson) => (
                  <Link
                    key={lesson.lessonId}
                    to={`/grammar/${lesson.lessonId}`}
                    className="group bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
                          Elementary
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                        {lesson.title}
                      </h3>
                      <p className="text-gray-600 mb-4 text-sm">{lesson.subtitle || `Learn about ${lesson.title}`}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-500">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          15 min
                        </div>
                        <div className="flex items-center text-primary-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                          Start
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Intermediate Section */}
          {filteredAndGroupedLessons.intermediate.length > 0 && (
            <div id="intermediate-section">
              <div className="flex items-center mb-6">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                <h2 className="px-6 text-2xl font-bold text-gray-900 flex items-center">
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700 mr-3">
                    Intermediate
                  </span>
                  Level
                </h2>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndGroupedLessons.intermediate.map((lesson) => (
                  <Link
                    key={lesson.lessonId}
                    to={`/grammar/${lesson.lessonId}`}
                    className="group bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          Intermediate
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                        {lesson.title}
                      </h3>
                      <p className="text-gray-600 mb-4 text-sm">{lesson.subtitle || `Learn about ${lesson.title}`}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-500">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          15 min
                        </div>
                        <div className="flex items-center text-primary-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                          Start
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Upper Intermediate Section */}
          {filteredAndGroupedLessons['upper-intermediate'].length > 0 && (
            <div id="upper-intermediate-section">
              <div className="flex items-center mb-6">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                <h2 className="px-6 text-2xl font-bold text-gray-900 flex items-center">
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-700 mr-3">
                    Upper Intermediate
                  </span>
                  Level
                </h2>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndGroupedLessons['upper-intermediate'].map((lesson) => (
                  <Link
                    key={lesson.lessonId}
                    to={`/grammar/${lesson.lessonId}`}
                    className="group bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                          Upper Intermediate
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                        {lesson.title}
                      </h3>
                      <p className="text-gray-600 mb-4 text-sm">{lesson.subtitle || `Learn about ${lesson.title}`}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-500">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          15 min
                        </div>
                        <div className="flex items-center text-primary-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                          Start
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Advanced Section */}
          {filteredAndGroupedLessons.advanced.length > 0 && (
            <div id="advanced-section">
              <div className="flex items-center mb-6">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                <h2 className="px-6 text-2xl font-bold text-gray-900 flex items-center">
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700 mr-3">
                    Advanced
                  </span>
                  Level
                </h2>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndGroupedLessons.advanced.map((lesson) => (
                  <Link
                    key={lesson.lessonId}
                    to={`/grammar/${lesson.lessonId}`}
                    className="group bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          Advanced
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                        {lesson.title}
                      </h3>
                      <p className="text-gray-600 mb-4 text-sm">{lesson.subtitle || `Learn about ${lesson.title}`}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-500">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          15 min
                        </div>
                        <div className="flex items-center text-primary-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                          Start
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scroll to Top Button */}
      {selectedLevel !== 'all' && (
        <div className="flex justify-center pt-8">
          <button
            onClick={() => {
              setSelectedLevel('all')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg"
          >
            Show All Levels
          </button>
        </div>
      )}
    </div>
  )
}
