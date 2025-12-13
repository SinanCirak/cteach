# Tilgo - English Learning Platform

<div align="center">

![Tilgo Logo](public/logo.svg)

**A modern, interactive web application for mastering English grammar and vocabulary**

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![AWS](https://img.shields.io/badge/AWS-Deployed-FF9900?logo=amazon-aws)](https://aws.amazon.com/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

[Live Demo](https://tilgo.cirak.ca) • [Documentation](#documentation) • [Features](#features) • [Tech Stack](#tech-stack)

</div>

---

## 📖 Overview

Tilgo is a comprehensive English learning platform designed to help learners master fundamental grammar rules and the 3,000-5,000 most common English words. Built with modern web technologies and deployed on AWS, Tilgo provides an interactive, student-friendly learning experience with real-time translation support for multiple languages.

### Key Highlights

- 🎯 **Structured Learning Path**: Progressive grammar lessons from beginner to advanced
- 📚 **Comprehensive Vocabulary**: 3,000-5,000 most common English words with definitions and examples
- 🌍 **Multi-Language Support**: Real-time word translation in 12+ languages
- ✅ **Interactive Quizzes**: Multiple quiz types to test and reinforce learning
- 📱 **Responsive Design**: Fully optimized for desktop, tablet, and mobile devices
- 🚀 **Cloud-Native**: Built on AWS serverless architecture for scalability and reliability

---

## ✨ Features

### Grammar Section

- **Interactive Lessons**: Clear, structured grammar explanations with visual aids
- **Progressive Learning**: Organized learning path from beginner to advanced levels
- **Comprehensive Content**: Each lesson includes:
  - Detailed explanations and formulas
  - Usage examples with context
  - Pro tips and best practices
  - Interactive quizzes
- **Progress Tracking**: Track your learning journey through structured lessons

### Vocabulary Section

- **Extensive Word Database**: 3,000-5,000 most common English words
- **Rich Context**: Each word includes:
  - Clear definitions
  - Usage examples
  - Part of speech information
  - Difficulty level classification
- **Advanced Search**: Filter words by level, category, or search term
- **Multiple Quiz Types**:
  - Definition matching
  - Word selection exercises
  - Multiple choice questions
- **Pagination**: Efficient browsing with paginated word lists

### Translation Features

- **Real-Time Translation**: Click any word to see its translation in your selected language
- **Multi-Language Support**: Support for 12+ languages including:
  - Turkish, French, Spanish, German, Italian, Portuguese
  - Chinese, Japanese, Korean, Arabic, Hindi, Russian
- **Context-Aware Translation**: Intelligent translation that considers word context
- **Batch Translation**: Pre-translate lesson content for faster loading

### Admin Panel

- **Content Management**: Easy-to-use interface for managing lessons and vocabulary
- **Bulk Upload**: Import multiple lessons or words at once via JSON
- **Quiz Creation**: Create custom quizzes for both grammar and vocabulary
- **Data Cleanup**: Remove duplicate entries with automated cleanup tools
- **Seed Data Loading**: Quick setup with pre-configured seed data

---

## 🛠️ Tech Stack

### Frontend

- **React 18** - Modern UI library with hooks and context API
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React Router v6** - Client-side routing
- **Vite** - Fast build tool and dev server

### Backend & Infrastructure

- **AWS Lambda** - Serverless functions for API endpoints
- **AWS API Gateway** - RESTful API management
- **AWS DynamoDB** - NoSQL database for lessons, quizzes, and vocabulary
- **AWS S3** - Static website hosting
- **AWS CloudFront** - Global CDN for fast content delivery
- **AWS Route53** - DNS management
- **AWS Translate** - Real-time language translation service
- **AWS ACM** - SSL/TLS certificate management

### Infrastructure as Code

- **Terraform** - Complete AWS infrastructure automation
- **GitHub** - Version control and CI/CD

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** or **yarn** package manager
- **AWS CLI** configured with credentials (for deployment)
- **Terraform** >= 1.0 (for infrastructure deployment)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SinanCirak/tilgo.git
   cd tilgo
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The production build will be in the `dist` directory, ready for deployment.

---

## 📁 Project Structure

```
tilgo/
├── src/
│   ├── components/          # Reusable React components
│   │   ├── Layout.tsx       # Main layout with navigation
│   │   ├── ClickableText.tsx # Word translation component
│   │   ├── WordTooltip.tsx  # Translation tooltip
│   │   └── LanguageSelector.tsx # Language selection dropdown
│   ├── contexts/            # React Context providers
│   │   ├── LanguageContext.tsx
│   │   └── TooltipContext.tsx
│   ├── hooks/               # Custom React hooks
│   │   └── useBatchTranslate.ts
│   ├── pages/               # Page components
│   │   ├── Home.tsx
│   │   ├── Grammar.tsx
│   │   ├── GrammarLesson.tsx
│   │   ├── GrammarQuiz.tsx
│   │   ├── Vocabulary.tsx
│   │   ├── VocabularyList.tsx
│   │   ├── VocabularyQuiz.tsx
│   │   └── Admin.tsx
│   ├── utils/               # Utility functions
│   │   ├── api.ts           # API client functions
│   │   ├── textExtractor.ts
│   │   └── translations.ts
│   ├── App.tsx              # Main app component with routing
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles
├── lambda/                  # AWS Lambda functions
│   ├── translate-word/      # Single word translation
│   ├── batch-translate/     # Batch translation
│   ├── get-grammar-lessons/ # Fetch grammar lessons
│   ├── get-grammar-lesson/  # Fetch single lesson
│   ├── get-grammar-quiz/    # Fetch grammar quiz
│   ├── get-vocabulary-words/# Fetch vocabulary words
│   ├── get-vocabulary-quiz/ # Fetch vocabulary quiz
│   ├── create-grammar-lesson/# Create grammar lesson
│   ├── create-vocabulary-word/# Create vocabulary word
│   ├── create-grammar-quiz/ # Create grammar quiz
│   ├── create-vocabulary-quiz/# Create vocabulary quiz
│   ├── bulk-upload/         # Bulk data upload
│   └── cleanup-duplicates/  # Remove duplicate entries
├── terraform/               # Infrastructure as Code
│   ├── main.tf              # Main Terraform configuration
│   ├── variables.tf         # Variable definitions
│   ├── outputs.tf           # Output values
│   └── README.md            # Terraform documentation
├── public/                  # Static assets
│   ├── logo.svg
│   ├── logo-icon.svg
│   └── seed-data.json       # Initial data for seeding
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

---

## 🌐 Deployment

Tilgo is deployed on AWS using a serverless architecture. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deployment Steps

1. **Configure Terraform variables**:
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your values
   ```

2. **Initialize and apply Terraform**:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

3. **Build and deploy frontend**:
   ```bash
   npm run build
   aws s3 sync dist/ s3://tilgo-website-prod/ --delete --region ca-central-1
   ```

4. **Invalidate CloudFront cache**:
   ```bash
   aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"
   ```

For complete deployment documentation, see [DEPLOYMENT.md](DEPLOYMENT.md) and [terraform/README.md](terraform/README.md).

---

## 📚 API Endpoints

### Grammar Endpoints

- `GET /grammar/lessons` - Get all grammar lessons
- `GET /grammar/lessons/{lessonId}` - Get a specific grammar lesson
- `GET /grammar/quizzes/{quizId}` - Get a grammar quiz

### Vocabulary Endpoints

- `GET /vocabulary/words` - Get vocabulary words (with optional filters)
- `GET /vocabulary/quizzes/{quizId}` - Get a vocabulary quiz

### Translation Endpoints

- `GET /translate/{word}` - Translate a single word
- `POST /translate/batch` - Batch translate multiple words

### Admin Endpoints

- `POST /admin/grammar` - Create a grammar lesson
- `POST /admin/vocabulary` - Create a vocabulary word
- `POST /admin/bulk` - Bulk upload data
- `POST /admin/grammar/quiz` - Create a grammar quiz
- `POST /admin/vocabulary/quiz` - Create a vocabulary quiz
- `POST /admin/cleanup` - Clean up duplicate entries

---

## 🗄️ Database Schema

### DynamoDB Tables

- **grammar_lessons**: Grammar lesson content
- **grammar_quizzes**: Grammar quiz questions and answers
- **vocabulary_words**: Vocabulary word definitions and examples
- **vocabulary_quizzes**: Vocabulary quiz questions
- **word_translations**: Cached word translations for performance

---

## 🧪 Development

### Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=https://your-api-gateway-url.execute-api.region.amazonaws.com/prod
```

---

## 📝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License.

---

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/) and [TypeScript](https://www.typescriptlang.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Deployed on [AWS](https://aws.amazon.com/)
- Icons and flags from [react-country-flag](https://www.npmjs.com/package/react-country-flag)

---

## 📧 Contact

For questions or support, please open an issue on [GitHub](https://github.com/SinanCirak/tilgo/issues).

---

<div align="center">

**Made with ❤️ for English learners worldwide**

[Website](https://tilgo.cirak.ca) • [GitHub](https://github.com/SinanCirak/tilgo)

</div>
