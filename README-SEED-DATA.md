# Seed Data Upload Guide

This file is used to upload hard-coded data to DynamoDB.

## Seed Data File

The `seed-data.json` file contains the following data:
- Grammar Lessons (6 lessons)
- Vocabulary Words (10 words)
- Grammar Quizzes (2 quizzes)
- Vocabulary Quizzes (1 quiz)

## Upload Methods

### Method 1: Admin Panel Bulk Upload (Recommended)

1. Go to the admin panel: `https://cteach.cirak.ca/admin`
2. Click on the "Bulk Upload" tab
3. Open the `seed-data.json` file and copy the relevant sections

#### Uploading Grammar Lessons:
- Select Type: `grammar_lessons`
- Copy and paste the `grammar_lessons` array from the `seed-data.json` file
- Click the "Upload Bulk Data" button

#### Uploading Vocabulary Words:
- Select Type: `vocabulary_words`
- Copy and paste the `vocabulary_words` array from the `seed-data.json` file
- Click the "Upload Bulk Data" button

#### Uploading Grammar Quizzes:
- Go to the "Grammar Quiz" tab
- For each quiz:
  - Select the Lesson ID (from the uploaded lessons)
  - Enter the quiz title
  - Add questions
  - Click the "Create Grammar Quiz" button

#### Uploading Vocabulary Quizzes:
- Go to the "Vocabulary Quiz" tab
- Enter the quiz title, level, and category
- Add questions
- Click the "Create Vocabulary Quiz" button

### Method 2: Direct Upload via AWS CLI

```bash
# Grammar Lessons
aws dynamodb batch-write-item \
  --request-items file://grammar-lessons-batch.json \
  --region ca-central-1

# Vocabulary Words
aws dynamodb batch-write-item \
  --request-items file://vocabulary-words-batch.json \
  --region ca-central-1
```

## Notes

- Grammar lessons must be uploaded before grammar quizzes
- Vocabulary quizzes can be uploaded independently
- After bulk upload, refresh the page and verify that the data is displayed
