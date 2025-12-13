import { useState } from 'react'
import { Link } from 'react-router-dom'

type QuizType = 'definition' | 'word-selection' | 'multiple-choice'

interface QuizQuestion {
  id: string
  type: QuizType
  word: string
  definition: string
  options: string[]
  correctAnswer: number
  example?: string
}

// Mock quiz data - will be replaced with DynamoDB data
const quizQuestions: QuizQuestion[] = [
  {
    id: '1',
    type: 'definition',
    word: 'abandon',
    definition: 'to leave behind or give up completely',
    options: [
      'to leave behind or give up completely',
      'to accept something willingly',
      'to build something new',
      'to celebrate an event',
    ],
    correctAnswer: 0,
    example: 'They had to abandon their car in the snow.',
  },
  {
    id: '2',
    type: 'word-selection',
    word: '',
    definition: 'the skill or power to do something',
    options: ['ability', 'absence', 'abstract', 'abundant'],
    correctAnswer: 0,
  },
  {
    id: '3',
    type: 'multiple-choice',
    word: 'abroad',
    definition: 'in or to a foreign country',
    options: [
      'He travels abroad for business.',
      'He stays abroad for business.',
      'He works abroad for business.',
      'All of the above are correct',
    ],
    correctAnswer: 3,
  },
  {
    id: '4',
    type: 'definition',
    word: 'absolute',
    definition: 'complete and total',
    options: [
      'partial and incomplete',
      'complete and total',
      'temporary and short',
      'uncertain and unclear',
    ],
    correctAnswer: 1,
    example: 'I have absolute confidence in you.',
  },
  {
    id: '5',
    type: 'word-selection',
    word: '',
    definition: 'existing in large quantities',
    options: ['abstract', 'abundant', 'academic', 'absolute'],
    correctAnswer: 1,
  },
]

export default function VocabularyQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [showResults, setShowResults] = useState(false)
  const [score, setScore] = useState(0)

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResults) return
    setSelectedAnswers({ ...selectedAnswers, [currentQuestion]: answerIndex })
  }

  const handleNext = () => {
    if (currentQuestion < quizQuestions.length - 1) {
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
    quizQuestions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        correct++
      }
    })
    setScore(correct)
  }

  const currentQ = quizQuestions[currentQuestion]
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
            {score} / {quizQuestions.length}
          </div>
          <p className="text-xl text-gray-600">
            {score === quizQuestions.length
              ? 'Perfect! You got all questions correct!'
              : `You answered ${score} out of ${quizQuestions.length} questions correctly.`}
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Link
              to="/vocabulary/list"
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Review Words
            </Link>
            <Link
              to="/vocabulary"
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              Back to Vocabulary
            </Link>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {quizQuestions.map((question, index) => {
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
                    Question {index + 1}
                  </h3>
                  {isCorrect ? (
                    <span className="text-green-600 font-bold">✓ Correct</span>
                  ) : (
                    <span className="text-red-600 font-bold">✗ Incorrect</span>
                  )}
                </div>
                {question.type === 'word-selection' ? (
                  <div>
                    <p className="text-gray-700 mb-4">
                      <span className="font-semibold">Definition: </span>
                      {question.definition}
                    </p>
                    <p className="text-gray-600 mb-2">Select the correct word:</p>
                  </div>
                ) : question.type === 'multiple-choice' ? (
                  <div>
                    <p className="text-gray-700 mb-4">
                      <span className="font-semibold">Word: </span>
                      {question.word}
                    </p>
                    <p className="text-gray-700 mb-4">
                      <span className="font-semibold">Definition: </span>
                      {question.definition}
                    </p>
                    <p className="text-gray-600 mb-2">Which sentence is correct?</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-700 mb-4">
                      <span className="font-semibold">Word: </span>
                      {question.word}
                    </p>
                    {question.example && (
                      <p className="text-gray-600 mb-4 italic">Example: {question.example}</p>
                    )}
                    <p className="text-gray-600 mb-2">Select the correct definition:</p>
                  </div>
                )}
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
          to="/vocabulary"
          className="flex items-center text-gray-600 hover:text-primary-600 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Vocabulary
        </Link>
        <div className="text-sm text-gray-600">
          Question {currentQuestion + 1} of {quizQuestions.length}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vocabulary Quiz</h1>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-6">
          {currentQ.type === 'word-selection' ? (
            <>
              <div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Definition:</h2>
                <p className="text-2xl text-gray-900">{currentQ.definition}</p>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Select the correct word:</h2>
              </div>
            </>
          ) : currentQ.type === 'multiple-choice' ? (
            <>
              <div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Word:</h2>
                <p className="text-2xl text-gray-900 mb-4">{currentQ.word}</p>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Definition:</h2>
                <p className="text-lg text-gray-700 mb-4">{currentQ.definition}</p>
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Which sentence is correct?</h2>
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Word:</h2>
                <p className="text-3xl font-bold text-primary-600 mb-4">{currentQ.word}</p>
                {currentQ.example && (
                  <div className="bg-primary-50 rounded-lg p-4 mb-4 border-l-4 border-primary-500">
                    <p className="text-gray-700 italic">Example: {currentQ.example}</p>
                  </div>
                )}
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Select the correct definition:</h2>
              </div>
            </>
          )}

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
            {currentQuestion === quizQuestions.length - 1 ? 'Finish Quiz' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

