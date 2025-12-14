import { useState, useEffect } from 'react'
import { createGrammarLesson, createVocabularyWord, bulkUpload, createGrammarQuiz, createVocabularyQuiz, getGrammarLessons, cleanupDuplicates, getLevels, createLevel, updateLevel, deleteLevel, getCategories, createCategory, updateCategory, deleteCategory, getImageUploadUrl, type Level, type Category } from '../utils/api'

type TabType = 'grammar' | 'vocabulary' | 'bulk' | 'grammar-quiz' | 'vocabulary-quiz' | 'levels' | 'categories' | 'images'

export default function Admin() {
  const [activeTab, setActiveTab] = useState<TabType>('grammar')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Grammar lesson form
  const [grammarForm, setGrammarForm] = useState({
    title: '',
    subtitle: '',
    content: '',
    formula: '',
    level: 'beginner',
    order: 0,
    uses: [] as Array<{ icon: string; title: string; description: string; example: string }>,
    examples: [] as Array<{ sentence: string; explanation: string }>,
    tips: [] as string[],
  })

  // Form state for dynamic arrays
  const [newUse, setNewUse] = useState({ icon: '', title: '', description: '', example: '' })
  const [newExample, setNewExample] = useState({ sentence: '', explanation: '' })
  const [newTip, setNewTip] = useState('')

  // Vocabulary word form
  const [vocabularyForm, setVocabularyForm] = useState({
    word: '',
    definition: '',
    example: '',
    partOfSpeech: 'noun',
    level: 'beginner',
    category: 'general',
  })

  // Bulk upload
  const [bulkData, setBulkData] = useState('')
  const [bulkType, setBulkType] = useState<'grammar_lessons' | 'vocabulary_words'>('grammar_lessons')

  // Grammar quiz form
  const [grammarQuizForm, setGrammarQuizForm] = useState({
    lessonId: '',
    title: '',
    questions: [] as Array<{ id: string; question: string; options: string[]; correctAnswer: number; explanation: string }>,
  })

  // Vocabulary quiz form
  const [vocabularyQuizForm, setVocabularyQuizForm] = useState({
    title: '',
    level: 'beginner',
    category: 'general',
    questions: [] as Array<{ id: string; type: string; word: string; definition: string; options: string[]; correctAnswer: number; example: string; explanation: string }>,
  })

  // Form state for dynamic quiz questions
  const [newGrammarQuestion, setNewGrammarQuestion] = useState({ question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' })
  const [newVocabularyQuestion, setNewVocabularyQuestion] = useState({ type: 'definition', word: '', definition: '', options: ['', '', '', ''], correctAnswer: 0, example: '', explanation: '' })

  // Available lessons for quiz
  const [availableLessons, setAvailableLessons] = useState<Array<{ lessonId: string; title: string }>>([])

  // Levels management
  const [levels, setLevels] = useState<Level[]>([])
  const [levelForm, setLevelForm] = useState({ name: '', description: '', order: 0, color: 'bg-gray-100', textColor: 'text-gray-700' })
  const [editingLevel, setEditingLevel] = useState<Level | null>(null)

  // Categories management
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', icon: '📚', color: 'bg-blue-100', textColor: 'text-blue-700' })
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  // Image upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)

  useEffect(() => {
    // Load available grammar lessons (only when grammar-quiz tab is active)
    if (activeTab === 'grammar-quiz') {
      getGrammarLessons()
        .then((data: any) => {
          if (data && data.lessons) {
            setAvailableLessons(data.lessons.map((l: any) => ({ lessonId: l.lessonId, title: l.title })))
          }
        })
        .catch((err) => {
          console.error('Failed to load lessons:', err)
          // Don't block page rendering on error
        })
    }
    
    // Load levels when levels tab is active
    if (activeTab === 'levels') {
      getLevels()
        .then((data) => {
          if (data && data.levels) {
            setLevels(data.levels)
          }
        })
        .catch((err) => {
          console.error('Failed to load levels:', err)
        })
    }
    
    // Load categories when categories tab is active
    if (activeTab === 'categories') {
      getCategories()
        .then((data) => {
          if (data && data.categories) {
            setCategories(data.categories)
          }
        })
        .catch((err) => {
          console.error('Failed to load categories:', err)
        })
    }
  }, [activeTab])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleGrammarSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const lesson = {
        ...grammarForm,
        content: grammarForm.content.split('\n').filter(line => line.trim()),
      }
      await createGrammarLesson(lesson)
      showMessage('success', 'Grammar lesson created successfully!')
      setGrammarForm({
        title: '',
        subtitle: '',
        content: '',
        formula: '',
        level: 'beginner',
        order: 0,
        uses: [],
        examples: [],
        tips: [],
      })
      setNewUse({ icon: '', title: '', description: '', example: '' })
      setNewExample({ sentence: '', explanation: '' })
      setNewTip('')
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to create grammar lesson')
    } finally {
      setLoading(false)
    }
  }

  const handleVocabularySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      await createVocabularyWord(vocabularyForm)
      showMessage('success', 'Vocabulary word created successfully!')
      setVocabularyForm({
        word: '',
        definition: '',
        example: '',
        partOfSpeech: 'noun',
        level: 'beginner',
        category: 'general',
      })
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to create vocabulary word')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkUpload = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const items = JSON.parse(bulkData)
      if (!Array.isArray(items)) {
        throw new Error('Bulk data must be an array')
      }
      const result = await bulkUpload(bulkType, items)
      showMessage('success', `Bulk upload completed: ${result.results.success.length} successful, ${result.results.errors.length} errors`)
      setBulkData('')
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to bulk upload')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-4xl font-bold text-primary-900 mb-8 text-center">Admin Panel</h1>

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Tabs */}
          <div className="flex space-x-4 mb-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('grammar')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'grammar'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Grammar Lesson
            </button>
            <button
              onClick={() => setActiveTab('vocabulary')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'vocabulary'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Vocabulary Word
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'bulk'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Bulk Upload
            </button>
            <button
              onClick={() => setActiveTab('grammar-quiz')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'grammar-quiz'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Grammar Quiz
            </button>
            <button
              onClick={() => setActiveTab('vocabulary-quiz')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'vocabulary-quiz'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Vocabulary Quiz
            </button>
            <button
              onClick={() => setActiveTab('levels')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'levels'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Levels
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'categories'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Categories
            </button>
            <button
              onClick={() => setActiveTab('images')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'images'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Images
            </button>
          </div>

          {/* Grammar Lesson Form */}
          {activeTab === 'grammar' && (
            <form onSubmit={handleGrammarSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  required
                  value={grammarForm.title}
                  onChange={(e) => setGrammarForm({ ...grammarForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
                <input
                  type="text"
                  value={grammarForm.subtitle}
                  onChange={(e) => setGrammarForm({ ...grammarForm, subtitle: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content * (one paragraph per line)</label>
                <textarea
                  required
                  rows={6}
                  value={grammarForm.content}
                  onChange={(e) => setGrammarForm({ ...grammarForm, content: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter content paragraphs, one per line..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Formula</label>
                <input
                  type="text"
                  value={grammarForm.formula}
                  onChange={(e) => setGrammarForm({ ...grammarForm, formula: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Subject + Verb + Object"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
                  <select
                    value={grammarForm.level}
                    onChange={(e) => setGrammarForm({ ...grammarForm, level: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                  <input
                    type="number"
                    value={grammarForm.order}
                    onChange={(e) => setGrammarForm({ ...grammarForm, order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Where to Use Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Where to Use</h3>
                {grammarForm.uses.map((use, index) => (
                  <div key={index} className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 grid grid-cols-4 gap-2">
                        <input
                          type="text"
                          placeholder="Icon (emoji)"
                          value={use.icon}
                          onChange={(e) => {
                            const newUses = [...grammarForm.uses]
                            newUses[index].icon = e.target.value
                            setGrammarForm({ ...grammarForm, uses: newUses })
                          }}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                        />
                        <input
                          type="text"
                          placeholder="Title"
                          value={use.title}
                          onChange={(e) => {
                            const newUses = [...grammarForm.uses]
                            newUses[index].title = e.target.value
                            setGrammarForm({ ...grammarForm, uses: newUses })
                          }}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                        />
                        <input
                          type="text"
                          placeholder="Description"
                          value={use.description}
                          onChange={(e) => {
                            const newUses = [...grammarForm.uses]
                            newUses[index].description = e.target.value
                            setGrammarForm({ ...grammarForm, uses: newUses })
                          }}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                        />
                        <input
                          type="text"
                          placeholder="Example"
                          value={use.example}
                          onChange={(e) => {
                            const newUses = [...grammarForm.uses]
                            newUses[index].example = e.target.value
                            setGrammarForm({ ...grammarForm, uses: newUses })
                          }}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newUses = grammarForm.uses.filter((_, i) => i !== index)
                          setGrammarForm({ ...grammarForm, uses: newUses })
                        }}
                        className="ml-2 text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Icon (emoji)"
                      value={newUse.icon}
                      onChange={(e) => setNewUse({ ...newUse, icon: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="text"
                      placeholder="Title"
                      value={newUse.title}
                      onChange={(e) => setNewUse({ ...newUse, title: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={newUse.description}
                      onChange={(e) => setNewUse({ ...newUse, description: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="text"
                      placeholder="Example"
                      value={newUse.example}
                      onChange={(e) => setNewUse({ ...newUse, example: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (newUse.title && newUse.description) {
                        setGrammarForm({ ...grammarForm, uses: [...grammarForm.uses, newUse] })
                        setNewUse({ icon: '', title: '', description: '', example: '' })
                      }
                    }}
                    className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                  >
                    + Add Use Case
                  </button>
                </div>
              </div>

              {/* Examples Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Examples</h3>
                {grammarForm.examples.map((example, index) => (
                  <div key={index} className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Sentence"
                          value={example.sentence}
                          onChange={(e) => {
                            const newExamples = [...grammarForm.examples]
                            newExamples[index].sentence = e.target.value
                            setGrammarForm({ ...grammarForm, examples: newExamples })
                          }}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                        />
                        <input
                          type="text"
                          placeholder="Explanation"
                          value={example.explanation}
                          onChange={(e) => {
                            const newExamples = [...grammarForm.examples]
                            newExamples[index].explanation = e.target.value
                            setGrammarForm({ ...grammarForm, examples: newExamples })
                          }}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newExamples = grammarForm.examples.filter((_, i) => i !== index)
                          setGrammarForm({ ...grammarForm, examples: newExamples })
                        }}
                        className="ml-2 text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Sentence"
                      value={newExample.sentence}
                      onChange={(e) => setNewExample({ ...newExample, sentence: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="text"
                      placeholder="Explanation"
                      value={newExample.explanation}
                      onChange={(e) => setNewExample({ ...newExample, explanation: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (newExample.sentence) {
                        setGrammarForm({ ...grammarForm, examples: [...grammarForm.examples, newExample] })
                        setNewExample({ sentence: '', explanation: '' })
                      }
                    }}
                    className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                  >
                    + Add Example
                  </button>
                </div>
              </div>

              {/* Pro Tips Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Pro Tips</h3>
                {grammarForm.tips.map((tip, index) => (
                  <div key={index} className="mb-2 p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <span>{tip}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newTips = grammarForm.tips.filter((_, i) => i !== index)
                        setGrammarForm({ ...grammarForm, tips: newTips })
                      }}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter a pro tip"
                    value={newTip}
                    onChange={(e) => setNewTip(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newTip.trim()) {
                        e.preventDefault()
                        setGrammarForm({ ...grammarForm, tips: [...grammarForm.tips, newTip] })
                        setNewTip('')
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newTip.trim()) {
                        setGrammarForm({ ...grammarForm, tips: [...grammarForm.tips, newTip] })
                        setNewTip('')
                      }
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Grammar Lesson'}
              </button>
            </form>
          )}

          {/* Vocabulary Word Form */}
          {activeTab === 'vocabulary' && (
            <form onSubmit={handleVocabularySubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Word *</label>
                <input
                  type="text"
                  required
                  value={vocabularyForm.word}
                  onChange={(e) => setVocabularyForm({ ...vocabularyForm, word: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Definition</label>
                <textarea
                  rows={3}
                  value={vocabularyForm.definition}
                  onChange={(e) => setVocabularyForm({ ...vocabularyForm, definition: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Example Sentence</label>
                <input
                  type="text"
                  value={vocabularyForm.example}
                  onChange={(e) => setVocabularyForm({ ...vocabularyForm, example: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Part of Speech</label>
                  <select
                    value={vocabularyForm.partOfSpeech}
                    onChange={(e) => setVocabularyForm({ ...vocabularyForm, partOfSpeech: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="noun">Noun</option>
                    <option value="verb">Verb</option>
                    <option value="adjective">Adjective</option>
                    <option value="adverb">Adverb</option>
                    <option value="preposition">Preposition</option>
                    <option value="conjunction">Conjunction</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
                  <select
                    value={vocabularyForm.level}
                    onChange={(e) => setVocabularyForm({ ...vocabularyForm, level: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <input
                    type="text"
                    value={vocabularyForm.category}
                    onChange={(e) => setVocabularyForm({ ...vocabularyForm, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., food, travel"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Vocabulary Word'}
              </button>
            </form>
          )}

          {/* Bulk Upload */}
          {activeTab === 'bulk' && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-red-900 mb-2">⚠️ Clean Duplicate Entries</h3>
                <p className="text-sm text-red-700 mb-3">
                  Remove duplicate entries from DynamoDB tables. This will keep the most recent entry for each unique title/word.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!confirm('Are you sure you want to clean duplicate grammar lessons? This action cannot be undone.')) return
                      try {
                        setLoading(true)
                        setMessage(null)
                        const result = await cleanupDuplicates('grammar_lessons')
                        showMessage('success', `Grammar lessons cleaned: ${result.deleted} duplicates removed, ${result.uniqueItems} unique items kept`)
                      } catch (error: any) {
                        showMessage('error', error.message || 'Failed to clean duplicates')
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Cleaning...' : 'Clean Grammar Lessons'}
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('Are you sure you want to clean duplicate vocabulary words? This action cannot be undone.')) return
                      try {
                        setLoading(true)
                        setMessage(null)
                        const result = await cleanupDuplicates('vocabulary_words')
                        showMessage('success', `Vocabulary words cleaned: ${result.deleted} duplicates removed, ${result.uniqueItems} unique items kept`)
                      } catch (error: any) {
                        showMessage('error', error.message || 'Failed to clean duplicates')
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Cleaning...' : 'Clean Vocabulary Words'}
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-900 mb-2">Quick Load Seed Data</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Load all seed data (grammar lessons, vocabulary words, quizzes) from seed-data.json file
                </p>
                <button
                  onClick={async () => {
                    try {
                      setLoading(true)
                      setMessage(null)
                      
                      // Fetch seed-data.json
                      const response = await fetch('/seed-data.json')
                      if (!response.ok) {
                        throw new Error('Failed to load seed-data.json file')
                      }
                      const seedData = await response.json()
                      
                      let totalSuccess = 0
                      let totalErrors = 0
                      const errors: string[] = []
                      
                      // Upload Grammar Lessons
                      if (seedData.grammar_lessons && seedData.grammar_lessons.length > 0) {
                        try {
                          const result = await bulkUpload('grammar_lessons', seedData.grammar_lessons)
                          totalSuccess += result.results.success.length
                          totalErrors += result.results.errors.length
                          if (result.results.errors.length > 0) {
                            errors.push(`Grammar Lessons: ${result.results.errors.length} errors`)
                          }
                        } catch (err: any) {
                          errors.push(`Grammar Lessons: ${err.message}`)
                        }
                      }
                      
                      // Upload Vocabulary Words
                      if (seedData.vocabulary_words && seedData.vocabulary_words.length > 0) {
                        try {
                          const result = await bulkUpload('vocabulary_words', seedData.vocabulary_words)
                          totalSuccess += result.results.success.length
                          totalErrors += result.results.errors.length
                          if (result.results.errors.length > 0) {
                            errors.push(`Vocabulary Words: ${result.results.errors.length} errors`)
                          }
                        } catch (err: any) {
                          errors.push(`Vocabulary Words: ${err.message}`)
                        }
                      }
                      
                      // Upload Grammar Quizzes
                      if (seedData.grammar_quizzes && seedData.grammar_quizzes.length > 0) {
                        for (const quiz of seedData.grammar_quizzes) {
                          try {
                            await createGrammarQuiz(quiz)
                            totalSuccess++
                          } catch (err: any) {
                            totalErrors++
                            errors.push(`Grammar Quiz "${quiz.title}": ${err.message}`)
                          }
                        }
                      }
                      
                      // Upload Vocabulary Quizzes
                      if (seedData.vocabulary_quizzes && seedData.vocabulary_quizzes.length > 0) {
                        for (const quiz of seedData.vocabulary_quizzes) {
                          try {
                            await createVocabularyQuiz(quiz)
                            totalSuccess++
                          } catch (err: any) {
                            totalErrors++
                            errors.push(`Vocabulary Quiz "${quiz.title}": ${err.message}`)
                          }
                        }
                      }
                      
                      const message = `Seed data loaded: ${totalSuccess} successful, ${totalErrors} errors${errors.length > 0 ? '. ' + errors.join('; ') : ''}`
                      showMessage(totalErrors === 0 ? 'success' : 'error', message)
                    } catch (error: any) {
                      showMessage('error', error.message || 'Failed to load seed data')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                >
                  {loading ? 'Loading Seed Data...' : 'Load All Seed Data from seed-data.json'}
                </button>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Manual Bulk Upload</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={bulkType}
                    onChange={(e) => setBulkType(e.target.value as 'grammar_lessons' | 'vocabulary_words')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="grammar_lessons">Grammar Lessons</option>
                    <option value="vocabulary_words">Vocabulary Words</option>
                  </select>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">JSON Data (Array)</label>
                  <textarea
                    rows={12}
                    value={bulkData}
                    onChange={(e) => setBulkData(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                    placeholder={bulkType === 'grammar_lessons' 
                      ? '[\n  {\n    "title": "Present Simple",\n    "subtitle": "Learn the basics",\n    "content": ["First paragraph", "Second paragraph"],\n    "formula": "Subject + Verb",\n    "uses": [{"icon": "🔄", "title": "Habits", "description": "Regular actions", "example": "I drink coffee."}],\n    "examples": [{"sentence": "I work.", "explanation": "Simple statement"}],\n    "tips": ["Tip 1", "Tip 2"],\n    "level": "beginner",\n    "order": 1\n  }\n]'
                      : '[\n  {\n    "word": "hello",\n    "definition": "A greeting",\n    "example": "Hello, how are you?",\n    "partOfSpeech": "noun",\n    "level": "beginner"\n  }\n]'
                    }
                  />
                </div>

                <button
                  onClick={handleBulkUpload}
                  disabled={loading || !bulkData.trim()}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {loading ? 'Uploading...' : 'Upload Bulk Data'}
                </button>
              </div>
            </div>
          )}

          {/* Grammar Quiz Form */}
          {activeTab === 'grammar-quiz' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Lesson *</label>
                <select
                  required
                  value={grammarQuizForm.lessonId}
                  onChange={(e) => setGrammarQuizForm({ ...grammarQuizForm, lessonId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">-- Select a lesson --</option>
                  {availableLessons.map((lesson) => (
                    <option key={lesson.lessonId} value={lesson.lessonId}>
                      {lesson.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Title *</label>
                <input
                  type="text"
                  required
                  value={grammarQuizForm.title}
                  onChange={(e) => setGrammarQuizForm({ ...grammarQuizForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Present Simple Tense Quiz"
                />
              </div>

              {/* Questions */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Questions</h3>
                {grammarQuizForm.questions.map((question, qIndex) => (
                  <div key={qIndex} className="mb-6 p-4 bg-gray-50 rounded-lg border">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold text-gray-700">Question {qIndex + 1}</h4>
                      <button
                        type="button"
                        onClick={() => {
                          const newQuestions = grammarQuizForm.questions.filter((_, i) => i !== qIndex)
                          setGrammarQuizForm({ ...grammarQuizForm, questions: newQuestions })
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        ✕ Remove
                      </button>
                    </div>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Question text"
                        value={question.question}
                        onChange={(e) => {
                          const newQuestions = [...grammarQuizForm.questions]
                          newQuestions[qIndex].question = e.target.value
                          setGrammarQuizForm({ ...grammarQuizForm, questions: newQuestions })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                      />
                      <div className="space-y-2">
                        {question.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${qIndex}`}
                              checked={question.correctAnswer === oIndex}
                              onChange={() => {
                                const newQuestions = [...grammarQuizForm.questions]
                                newQuestions[qIndex].correctAnswer = oIndex
                                setGrammarQuizForm({ ...grammarQuizForm, questions: newQuestions })
                              }}
                              className="w-4 h-4 text-primary-600"
                            />
                            <input
                              type="text"
                              placeholder={`Option ${oIndex + 1}`}
                              value={option}
                              onChange={(e) => {
                                const newQuestions = [...grammarQuizForm.questions]
                                newQuestions[qIndex].options[oIndex] = e.target.value
                                setGrammarQuizForm({ ...grammarQuizForm, questions: newQuestions })
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Explanation (optional)"
                        value={question.explanation}
                        onChange={(e) => {
                          const newQuestions = [...grammarQuizForm.questions]
                          newQuestions[qIndex].explanation = e.target.value
                          setGrammarQuizForm({ ...grammarQuizForm, questions: newQuestions })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                ))}
                <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Question text"
                      value={newGrammarQuestion.question}
                      onChange={(e) => setNewGrammarQuestion({ ...newGrammarQuestion, question: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <div className="space-y-2">
                      {newGrammarQuestion.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="new-correct"
                            checked={newGrammarQuestion.correctAnswer === oIndex}
                            onChange={() => setNewGrammarQuestion({ ...newGrammarQuestion, correctAnswer: oIndex })}
                            className="w-4 h-4 text-primary-600"
                          />
                          <input
                            type="text"
                            placeholder={`Option ${oIndex + 1}`}
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...newGrammarQuestion.options]
                              newOptions[oIndex] = e.target.value
                              setNewGrammarQuestion({ ...newGrammarQuestion, options: newOptions })
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Explanation (optional)"
                      value={newGrammarQuestion.explanation}
                      onChange={(e) => setNewGrammarQuestion({ ...newGrammarQuestion, explanation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newGrammarQuestion.question && newGrammarQuestion.options.filter(o => o.trim()).length >= 2) {
                          setGrammarQuizForm({
                            ...grammarQuizForm,
                            questions: [...grammarQuizForm.questions, {
                              id: `q${grammarQuizForm.questions.length + 1}`,
                              ...newGrammarQuestion
                            }]
                          })
                          setNewGrammarQuestion({ question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' })
                        }
                      }}
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                    >
                      + Add Question
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={async () => {
                  if (!grammarQuizForm.lessonId || !grammarQuizForm.title || grammarQuizForm.questions.length === 0) {
                    showMessage('error', 'Please fill in all required fields and add at least one question')
                    return
                  }
                  setLoading(true)
                  setMessage(null)
                  try {
                    await createGrammarQuiz(grammarQuizForm)
                    showMessage('success', 'Grammar quiz created successfully!')
                    setGrammarQuizForm({ lessonId: '', title: '', questions: [] })
                    setNewGrammarQuestion({ question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' })
                  } catch (error: any) {
                    showMessage('error', error.message || 'Failed to create grammar quiz')
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Grammar Quiz'}
              </button>
            </div>
          )}

          {/* Vocabulary Quiz Form */}
          {activeTab === 'vocabulary-quiz' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Title *</label>
                <input
                  type="text"
                  required
                  value={vocabularyQuizForm.title}
                  onChange={(e) => setVocabularyQuizForm({ ...vocabularyQuizForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Beginner Vocabulary Quiz"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
                  <select
                    value={vocabularyQuizForm.level}
                    onChange={(e) => setVocabularyQuizForm({ ...vocabularyQuizForm, level: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <input
                    type="text"
                    value={vocabularyQuizForm.category}
                    onChange={(e) => setVocabularyQuizForm({ ...vocabularyQuizForm, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., general, food"
                  />
                </div>
              </div>

              {/* Questions */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Questions</h3>
                {vocabularyQuizForm.questions.map((question, qIndex) => (
                  <div key={qIndex} className="mb-6 p-4 bg-gray-50 rounded-lg border">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold text-gray-700">Question {qIndex + 1}</h4>
                      <button
                        type="button"
                        onClick={() => {
                          const newQuestions = vocabularyQuizForm.questions.filter((_, i) => i !== qIndex)
                          setVocabularyQuizForm({ ...vocabularyQuizForm, questions: newQuestions })
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        ✕ Remove
                      </button>
                    </div>
                    <div className="space-y-3">
                      <select
                        value={question.type}
                        onChange={(e) => {
                          const newQuestions = [...vocabularyQuizForm.questions]
                          newQuestions[qIndex].type = e.target.value
                          setVocabularyQuizForm({ ...vocabularyQuizForm, questions: newQuestions })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="definition">Definition</option>
                        <option value="word-selection">Word Selection</option>
                        <option value="multiple-choice">Multiple Choice</option>
                      </select>
                      {question.type !== 'word-selection' && (
                        <input
                          type="text"
                          placeholder="Word"
                          value={question.word}
                          onChange={(e) => {
                            const newQuestions = [...vocabularyQuizForm.questions]
                            newQuestions[qIndex].word = e.target.value
                            setVocabularyQuizForm({ ...vocabularyQuizForm, questions: newQuestions })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                        />
                      )}
                      <input
                        type="text"
                        placeholder="Definition"
                        value={question.definition}
                        onChange={(e) => {
                          const newQuestions = [...vocabularyQuizForm.questions]
                          newQuestions[qIndex].definition = e.target.value
                          setVocabularyQuizForm({ ...vocabularyQuizForm, questions: newQuestions })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                      />
                      <div className="space-y-2">
                        {question.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`vocab-correct-${qIndex}`}
                              checked={question.correctAnswer === oIndex}
                              onChange={() => {
                                const newQuestions = [...vocabularyQuizForm.questions]
                                newQuestions[qIndex].correctAnswer = oIndex
                                setVocabularyQuizForm({ ...vocabularyQuizForm, questions: newQuestions })
                              }}
                              className="w-4 h-4 text-primary-600"
                            />
                            <input
                              type="text"
                              placeholder={`Option ${oIndex + 1}`}
                              value={option}
                              onChange={(e) => {
                                const newQuestions = [...vocabularyQuizForm.questions]
                                newQuestions[qIndex].options[oIndex] = e.target.value
                                setVocabularyQuizForm({ ...vocabularyQuizForm, questions: newQuestions })
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Example sentence (optional)"
                        value={question.example}
                        onChange={(e) => {
                          const newQuestions = [...vocabularyQuizForm.questions]
                          newQuestions[qIndex].example = e.target.value
                          setVocabularyQuizForm({ ...vocabularyQuizForm, questions: newQuestions })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                      />
                      <input
                        type="text"
                        placeholder="Explanation (optional)"
                        value={question.explanation}
                        onChange={(e) => {
                          const newQuestions = [...vocabularyQuizForm.questions]
                          newQuestions[qIndex].explanation = e.target.value
                          setVocabularyQuizForm({ ...vocabularyQuizForm, questions: newQuestions })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                ))}
                <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="space-y-3">
                    <select
                      value={newVocabularyQuestion.type}
                      onChange={(e) => setNewVocabularyQuestion({ ...newVocabularyQuestion, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="definition">Definition</option>
                      <option value="word-selection">Word Selection</option>
                      <option value="multiple-choice">Multiple Choice</option>
                    </select>
                    {newVocabularyQuestion.type !== 'word-selection' && (
                      <input
                        type="text"
                        placeholder="Word"
                        value={newVocabularyQuestion.word}
                        onChange={(e) => setNewVocabularyQuestion({ ...newVocabularyQuestion, word: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                      />
                    )}
                    <input
                      type="text"
                      placeholder="Definition"
                      value={newVocabularyQuestion.definition}
                      onChange={(e) => setNewVocabularyQuestion({ ...newVocabularyQuestion, definition: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <div className="space-y-2">
                      {newVocabularyQuestion.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="new-vocab-correct"
                            checked={newVocabularyQuestion.correctAnswer === oIndex}
                            onChange={() => setNewVocabularyQuestion({ ...newVocabularyQuestion, correctAnswer: oIndex })}
                            className="w-4 h-4 text-primary-600"
                          />
                          <input
                            type="text"
                            placeholder={`Option ${oIndex + 1}`}
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...newVocabularyQuestion.options]
                              newOptions[oIndex] = e.target.value
                              setNewVocabularyQuestion({ ...newVocabularyQuestion, options: newOptions })
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Example sentence (optional)"
                      value={newVocabularyQuestion.example}
                      onChange={(e) => setNewVocabularyQuestion({ ...newVocabularyQuestion, example: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="text"
                      placeholder="Explanation (optional)"
                      value={newVocabularyQuestion.explanation}
                      onChange={(e) => setNewVocabularyQuestion({ ...newVocabularyQuestion, explanation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newVocabularyQuestion.definition && newVocabularyQuestion.options.filter(o => o.trim()).length >= 2) {
                          setVocabularyQuizForm({
                            ...vocabularyQuizForm,
                            questions: [...vocabularyQuizForm.questions, {
                              id: `q${vocabularyQuizForm.questions.length + 1}`,
                              ...newVocabularyQuestion
                            }]
                          })
                          setNewVocabularyQuestion({ type: 'definition', word: '', definition: '', options: ['', '', '', ''], correctAnswer: 0, example: '', explanation: '' })
                        }
                      }}
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                    >
                      + Add Question
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={async () => {
                  if (!vocabularyQuizForm.title || vocabularyQuizForm.questions.length === 0) {
                    showMessage('error', 'Please fill in all required fields and add at least one question')
                    return
                  }
                  setLoading(true)
                  setMessage(null)
                  try {
                    await createVocabularyQuiz(vocabularyQuizForm)
                    showMessage('success', 'Vocabulary quiz created successfully!')
                    setVocabularyQuizForm({ title: '', level: 'beginner', category: 'general', questions: [] })
                    setNewVocabularyQuestion({ type: 'definition', word: '', definition: '', options: ['', '', '', ''], correctAnswer: 0, example: '', explanation: '' })
                  } catch (error: any) {
                    showMessage('error', error.message || 'Failed to create vocabulary quiz')
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Vocabulary Quiz'}
              </button>
            </div>
          )}

          {/* Levels Management */}
          {activeTab === 'levels' && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Manage Levels</h2>
                <p className="text-sm text-gray-600">Create and manage difficulty levels (Beginner, Elementary, Intermediate, etc.)</p>
              </div>

              {/* Level Form */}
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">{editingLevel ? 'Edit Level' : 'Create New Level'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      value={levelForm.name}
                      onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Beginner"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Order *</label>
                    <input
                      type="number"
                      value={levelForm.order}
                      onChange={(e) => setLevelForm({ ...levelForm, order: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <input
                      type="text"
                      value={levelForm.description}
                      onChange={(e) => setLevelForm({ ...levelForm, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Optional description"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Background Color (Tailwind class)</label>
                    <input
                      type="text"
                      value={levelForm.color}
                      onChange={(e) => setLevelForm({ ...levelForm, color: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="bg-green-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Text Color (Tailwind class)</label>
                    <input
                      type="text"
                      value={levelForm.textColor}
                      onChange={(e) => setLevelForm({ ...levelForm, textColor: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="text-green-700"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!levelForm.name || levelForm.order === undefined) {
                        showMessage('error', 'Name and order are required')
                        return
                      }
                      try {
                        setLoading(true)
                        if (editingLevel) {
                          await updateLevel(editingLevel.levelId, levelForm)
                          showMessage('success', 'Level updated successfully!')
                        } else {
                          await createLevel(levelForm)
                          showMessage('success', 'Level created successfully!')
                        }
                        setLevelForm({ name: '', description: '', order: 0, color: 'bg-gray-100', textColor: 'text-gray-700' })
                        setEditingLevel(null)
                        const data = await getLevels()
                        if (data && data.levels) {
                          setLevels(data.levels)
                        }
                      } catch (error: any) {
                        showMessage('error', error.message || 'Failed to save level')
                      } finally {
                        setLoading(false)
                      }
                    }}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    disabled={loading}
                  >
                    {editingLevel ? 'Update Level' : 'Create Level'}
                  </button>
                  {editingLevel && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLevel(null)
                        setLevelForm({ name: '', description: '', order: 0, color: 'bg-gray-100', textColor: 'text-gray-700' })
                      }}
                      className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Levels List */}
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Existing Levels</h3>
                {levels.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No levels created yet. Create your first level above.</p>
                ) : (
                  <div className="space-y-3">
                    {levels.sort((a, b) => (a.order || 0) - (b.order || 0)).map((level) => (
                      <div key={level.levelId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${level.color || 'bg-gray-100'} ${level.textColor || 'text-gray-700'}`}>
                            {level.name}
                          </span>
                          <span className="text-sm text-gray-600">Order: {level.order}</span>
                          {level.description && <span className="text-sm text-gray-500">{level.description}</span>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingLevel(level)
                              setLevelForm({
                                name: level.name,
                                description: level.description || '',
                                order: level.order,
                                color: level.color || 'bg-gray-100',
                                textColor: level.textColor || 'text-gray-700'
                              })
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Are you sure you want to delete "${level.name}"?`)) {
                                try {
                                  setLoading(true)
                                  await deleteLevel(level.levelId)
                                  showMessage('success', 'Level deleted successfully!')
                                  const data = await getLevels()
                                  if (data && data.levels) {
                                    setLevels(data.levels)
                                  }
                                } catch (error: any) {
                                  showMessage('error', error.message || 'Failed to delete level')
                                } finally {
                                  setLoading(false)
                                }
                              }
                            }}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                            disabled={loading}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Categories Management */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="bg-purple-50 p-4 rounded-lg mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Manage Categories</h2>
                <p className="text-sm text-gray-600">Create and manage subject categories (Math, Physics, Languages, etc.)</p>
              </div>

              {/* Category Form */}
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">{editingCategory ? 'Edit Category' : 'Create New Category'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Mathematics"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Icon (Emoji)</label>
                    <input
                      type="text"
                      value={categoryForm.icon}
                      onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="📚"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <input
                      type="text"
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Optional description"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Background Color (Tailwind class)</label>
                    <input
                      type="text"
                      value={categoryForm.color}
                      onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="bg-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Text Color (Tailwind class)</label>
                    <input
                      type="text"
                      value={categoryForm.textColor}
                      onChange={(e) => setCategoryForm({ ...categoryForm, textColor: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="text-blue-700"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!categoryForm.name) {
                        showMessage('error', 'Name is required')
                        return
                      }
                      try {
                        setLoading(true)
                        if (editingCategory) {
                          await updateCategory(editingCategory.categoryId, categoryForm)
                          showMessage('success', 'Category updated successfully!')
                        } else {
                          await createCategory(categoryForm)
                          showMessage('success', 'Category created successfully!')
                        }
                        setCategoryForm({ name: '', description: '', icon: '📚', color: 'bg-blue-100', textColor: 'text-blue-700' })
                        setEditingCategory(null)
                        const data = await getCategories()
                        if (data && data.categories) {
                          setCategories(data.categories)
                        }
                      } catch (error: any) {
                        showMessage('error', error.message || 'Failed to save category')
                      } finally {
                        setLoading(false)
                      }
                    }}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    disabled={loading}
                  >
                    {editingCategory ? 'Update Category' : 'Create Category'}
                  </button>
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(null)
                        setCategoryForm({ name: '', description: '', icon: '📚', color: 'bg-blue-100', textColor: 'text-blue-700' })
                      }}
                      className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Categories List */}
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Existing Categories</h3>
                {categories.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No categories created yet. Create your first category above.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categories.map((category) => (
                      <div key={category.categoryId} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{category.icon || '📚'}</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${category.color || 'bg-blue-100'} ${category.textColor || 'text-blue-700'}`}>
                              {category.name}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingCategory(category)
                                setCategoryForm({
                                  name: category.name,
                                  description: category.description || '',
                                  icon: category.icon || '📚',
                                  color: category.color || 'bg-blue-100',
                                  textColor: category.textColor || 'text-blue-700'
                                })
                              }}
                              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete "${category.name}"?`)) {
                                  try {
                                    setLoading(true)
                                    await deleteCategory(category.categoryId)
                                    showMessage('success', 'Category deleted successfully!')
                                    const data = await getCategories()
                                    if (data && data.categories) {
                                      setCategories(data.categories)
                                    }
                                  } catch (error: any) {
                                    showMessage('error', error.message || 'Failed to delete category')
                                  } finally {
                                    setLoading(false)
                                  }
                                }
                              }}
                              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                              disabled={loading}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        {category.description && (
                          <p className="text-sm text-gray-600 mt-2">{category.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Image Upload */}
          {activeTab === 'images' && (
            <div className="space-y-6">
              <div className="bg-green-50 p-4 rounded-lg mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Images</h2>
                <p className="text-sm text-gray-600">Upload images for your lessons and content. Supported formats: JPEG, PNG, GIF, WebP</p>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Image</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setSelectedFile(file)
                          setUploadedImageUrl(null)
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {selectedFile && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>File:</strong> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Type:</strong> {selectedFile.type}
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      if (!selectedFile) {
                        showMessage('error', 'Please select an image file')
                        return
                      }
                      try {
                        setLoading(true)
                        // Get presigned URL
                        const { uploadUrl, fileUrl } = await getImageUploadUrl(selectedFile.name, selectedFile.type)
                        
                        // Upload to S3
                        const uploadResponse = await fetch(uploadUrl, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': selectedFile.type,
                          },
                          body: selectedFile,
                        })

                        if (!uploadResponse.ok) {
                          throw new Error('Failed to upload image to S3')
                        }

                        setUploadedImageUrl(fileUrl)
                        showMessage('success', 'Image uploaded successfully!')
                        setSelectedFile(null)
                      } catch (error: any) {
                        showMessage('error', error.message || 'Failed to upload image')
                      } finally {
                        setLoading(false)
                      }
                    }}
                    className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
                    disabled={loading || !selectedFile}
                  >
                    {loading ? 'Uploading...' : 'Upload Image'}
                  </button>

                  {uploadedImageUrl && (
                    <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                      <p className="text-sm font-semibold text-green-800 mb-2">Image uploaded successfully!</p>
                      <div className="bg-white p-3 rounded border border-green-300 mb-3">
                        <p className="text-xs text-gray-600 mb-1">Image URL:</p>
                        <code className="text-xs break-all text-gray-800">{uploadedImageUrl}</code>
                      </div>
                      <div className="flex items-center gap-4">
                        <img src={uploadedImageUrl} alt="Uploaded" className="max-w-xs max-h-48 rounded-lg border border-gray-300" />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(uploadedImageUrl)
                            showMessage('success', 'URL copied to clipboard!')
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm"
                        >
                          Copy URL
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

