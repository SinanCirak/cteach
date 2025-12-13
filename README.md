# Tilgo - English Learning Platform

A modern web application for learning English grammar and vocabulary, designed to help users master fundamental grammar rules and 3,000-5,000 most common English words.

## Features

### Grammar Section
- Interactive grammar lessons with clear explanations
- Structured learning path from beginner to advanced
- Comprehensive quizzes after each lesson
- Progress tracking

### Vocabulary Section
- Word list with definitions and examples
- Search and filter functionality
- Multiple quiz types:
  - Definition matching
  - Word selection
  - Multiple choice questions
- Support for 3,000-5,000 common words

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Build Tool**: Vite
- **Deployment**: AWS S3 (planned)
- **Database**: DynamoDB (planned)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Tilgo
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The production build will be in the `dist` directory, ready for deployment to AWS S3.

## Project Structure

```
tilgo/
├── src/
│   ├── components/       # Reusable components
│   │   └── Layout.tsx   # Main layout with navigation
│   ├── pages/           # Page components
│   │   ├── Home.tsx
│   │   ├── Grammar.tsx
│   │   ├── GrammarLesson.tsx
│   │   ├── GrammarQuiz.tsx
│   │   ├── Vocabulary.tsx
│   │   ├── VocabularyList.tsx
│   │   └── VocabularyQuiz.tsx
│   ├── App.tsx          # Main app component with routing
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── index.html           # HTML template
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

## Future Enhancements

- [ ] Connect to DynamoDB for data storage
- [ ] User authentication and progress tracking
- [ ] Spaced repetition system for vocabulary
- [ ] Audio pronunciation for words
- [ ] Mobile-responsive improvements
- [ ] Analytics and performance tracking

## License

ISC

