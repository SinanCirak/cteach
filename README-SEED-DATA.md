# Seed Data Upload Guide

Bu dosya, hard-coded data'yı DynamoDB'ye yüklemek için kullanılır.

## Seed Data Dosyası

`seed-data.json` dosyası şu verileri içerir:
- Grammar Lessons (6 ders)
- Vocabulary Words (10 kelime)
- Grammar Quizzes (2 quiz)
- Vocabulary Quizzes (1 quiz)

## Yükleme Yöntemleri

### Yöntem 1: Admin Panel Bulk Upload (Önerilen)

1. Admin paneline gidin: `https://tilgo.cirak.ca/admin`
2. "Bulk Upload" sekmesine tıklayın
3. `seed-data.json` dosyasını açın ve ilgili bölümleri kopyalayın

#### Grammar Lessons Yükleme:
- Type: `grammar_lessons` seçin
- `seed-data.json` dosyasındaki `grammar_lessons` array'ini kopyalayıp yapıştırın
- "Upload Bulk Data" butonuna tıklayın

#### Vocabulary Words Yükleme:
- Type: `vocabulary_words` seçin
- `seed-data.json` dosyasındaki `vocabulary_words` array'ini kopyalayıp yapıştırın
- "Upload Bulk Data" butonuna tıklayın

#### Grammar Quizzes Yükleme:
- "Grammar Quiz" sekmesine gidin
- Her quiz için:
  - Lesson ID'yi seçin (yüklenen lesson'lardan)
  - Quiz başlığını girin
  - Soruları ekleyin
  - "Create Grammar Quiz" butonuna tıklayın

#### Vocabulary Quizzes Yükleme:
- "Vocabulary Quiz" sekmesine gidin
- Quiz başlığını, level ve category'yi girin
- Soruları ekleyin
- "Create Vocabulary Quiz" butonuna tıklayın

### Yöntem 2: AWS CLI ile Direkt Yükleme

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

## Notlar

- Grammar quizzes için önce grammar lessons'ın yüklenmiş olması gerekir
- Vocabulary quizzes bağımsız olarak yüklenebilir
- Bulk upload sonrası sayfayı yenileyin ve verilerin göründüğünü kontrol edin

