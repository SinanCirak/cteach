import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getGrammarQuiz } from '../utils/api'

interface Quiz {
  quizId: string
  lessonId: string
  title: string
  questions: {
    id: string
    question: string
    options: string[]
    correctAnswer: number
    explanation: string
  }[]
}

export default function GrammarQuiz() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [showResults, setShowResults] = useState(false)
  const [score, setScore] = useState(0)

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!lessonId) return
      
      try {
        setLoading(true)
        // First, we need to find the quiz by lessonId
        // For now, we'll use lessonId as quizId (you may need to adjust this based on your data structure)
        // TODO: Add API endpoint to get quiz by lessonId
        const data = await getGrammarQuiz(lessonId)
        setQuiz(data)
      } catch (err: any) {
        console.error('Failed to fetch quiz:', err)
        setError(err.message || 'Failed to load quiz')
      } finally {
        setLoading(false)
      }
    }

    fetchQuiz()
  }, [lessonId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{error || 'Quiz not found'}</h2>
        <Link to="/grammar" className="text-primary-600 hover:underline">
          Back to Grammar Lessons
        </Link>
      </div>
    )
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResults) return
    setSelectedAnswers({ ...selectedAnswers, [currentQuestion]: answerIndex })
  }

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      calculateScore()
      setShowResults(true)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const calculateScore = () => {
    let correct = 0
    quiz.questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        correct++
      }
    })
    setScore(correct)
  }

  const currentQ = quiz.questions[currentQuestion]
  const selectedAnswer = selectedAnswers[currentQuestion]

  if (showResults) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Quiz Complete!</h2>
          <div className="text-5xl font-bold text-primary-600">
            {score} / {quiz.questions.length}
          </div>
          <p className="text-xl text-gray-600">
            {score === quiz.questions.length
              ? 'Perfect! You got all questions correct!'
              : `You answered ${score} out of ${quiz.questions.length} questions correctly.`}
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Link
              to={`/grammar/${lessonId}`}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Review Lesson
            </Link>
            <Link
              to="/grammar"
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              Back to Lessons
            </Link>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {quiz.questions.map((question, index) => {
            const isCorrect = selectedAnswers[index] === question.correctAnswer
            return (
              <div
                key={question.id}
                className={`bg-white rounded-xl p-6 border-2 ${
                  isCorrect ? 'border-green-500' : 'border-red-500'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Question {index + 1}: {question.question}
                  </h3>
                  {isCorrect ? (
                    <span className="text-green-600 font-bold">✓ Correct</span>
                  ) : (
                    <span className="text-red-600 font-bold">✗ Incorrect</span>
                  )}
                </div>
                <div className="space-y-2 mb-4">
                  {question.options.map((option, optIndex) => {
                    const isSelected = selectedAnswers[index] === optIndex
                    const isCorrectOption = optIndex === question.correctAnswer
                    return (
                      <div
                        key={optIndex}
                        className={`p-3 rounded-lg border-2 ${
                          isCorrectOption
                            ? 'border-green-500 bg-green-50'
                            : isSelected && !isCorrectOption
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200'
                        }`}
                      >
                        {option}
                        {isCorrectOption && (
                          <span className="ml-2 text-green-600 font-semibold">(Correct Answer)</span>
                        )}
                      </div>
                    )
                  })}
                </div>
                <p className="text-gray-600 italic">{question.explanation}</p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Link
          to={`/grammar/${lessonId}`}
          className="flex items-center text-gray-600 hover:text-primary-600 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Lesson
        </Link>
        <div className="text-sm text-gray-600">
          Question {currentQuestion + 1} of {quiz.questions.length}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">{currentQ.question}</h2>
          <div className="space-y-3">
            {currentQ.options.map((option, index) => {
              const isSelected = selectedAnswer === index
              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 text-primary-900'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div
                      className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                        isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-400'
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <span className="font-medium">{option}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={selectedAnswer === undefined}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentQuestion === quiz.questions.length - 1 ? 'Finish Quiz' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

