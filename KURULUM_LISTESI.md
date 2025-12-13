# 📋 Tilgo Kurulum Listesi

## ✅ Tamamlananlar

### Frontend (React)
- ✅ React + TypeScript + Vite
- ✅ Tailwind CSS
- ✅ React Router
- ✅ Language Selector (12 dil)
- ✅ Batch Translate Hook
- ✅ ClickableText Component

### Backend (AWS Lambda)
- ✅ translate-word Lambda (tek kelime çeviri)
- ✅ batch-translate Lambda (toplu çeviri)

### Infrastructure (Terraform)
- ✅ S3 Bucket (static site hosting)
- ✅ CloudFront Distribution
- ✅ Route53 DNS
- ✅ ACM Certificate (SSL)
- ✅ DynamoDB Tables (4 tablo)
- ✅ API Gateway (REST API)
- ✅ IAM Roles & Policies
- ✅ Lambda Functions (translate-word, batch-translate)
- ✅ API Gateway Integration (translate endpoints)

---

## ❌ EKSİK OLAN PARÇALAR

### 1. Lambda Fonksiyonları (Grammar & Vocabulary API)

#### Eksik Lambda Fonksiyonları:
- ❌ `lambda/get-grammar-lessons/index.js` - Tüm grammar derslerini listele
- ❌ `lambda/get-grammar-lesson/index.js` - Tek bir grammar dersi getir
- ❌ `lambda/get-grammar-quiz/index.js` - Grammar quiz getir
- ❌ `lambda/get-vocabulary-words/index.js` - Vocabulary kelimelerini getir

**Her Lambda için gerekli:**
- `index.js` (fonksiyon kodu)
- `package.json` (dependencies: aws-sdk)

### 2. API Gateway Method & Integration'ları

#### Eksik API Gateway Yapılandırmaları:
- ❌ `GET /grammar/lessons` → Lambda integration
- ❌ `GET /grammar/lessons/{lessonId}` → Lambda integration
- ❌ `GET /grammar/quizzes/{quizId}` → Lambda integration
- ❌ `GET /vocabulary/words` → Lambda integration
- ❌ CORS (OPTIONS) method'ları bu endpoint'ler için

**Terraform'da eklenmesi gerekenler:**
- `aws_api_gateway_method` (GET, OPTIONS)
- `aws_api_gateway_integration` (Lambda)
- `aws_api_gateway_method_response`
- `aws_api_gateway_integration_response`
- `aws_lambda_permission` (API Gateway için)

### 3. Environment Variables

#### Frontend (.env dosyası)
- ❌ `.env` dosyası oluşturulmalı:
```
VITE_API_URL=https://<api-id>.execute-api.ca-central-1.amazonaws.com/prod
```

**Not:** Terraform apply sonrası API Gateway URL'i alınacak.

### 4. DynamoDB Veri Yükleme

#### Seed Data Scripts
- ❌ `scripts/seed-grammar-lessons.js` - Grammar derslerini DynamoDB'ye yükle
- ❌ `scripts/seed-vocabulary-words.js` - Vocabulary kelimelerini DynamoDB'ye yükle
- ❌ `scripts/seed-grammar-quizzes.js` - Grammar quiz'lerini DynamoDB'ye yükle

**Gerekli veri formatları:**
- Grammar lessons (lessonId, title, content, examples, etc.)
- Grammar quizzes (quizId, lessonId, questions, answers)
- Vocabulary words (wordId, word, definition, example, level)

### 5. Lambda Dependencies

#### Node Modules Kurulumu
- ❌ `lambda/translate-word/node_modules` (npm install gerekli)
- ❌ `lambda/batch-translate/node_modules` (npm install gerekli)
- ❌ Yeni Lambda'lar için de npm install gerekli

**Not:** Terraform `excludes = ["node_modules"]` kullanıyor, bu yüzden önce npm install yapılmalı.

### 6. Deployment Scripts

#### Otomasyon Scripts
- ❌ `scripts/deploy.sh` veya `scripts/deploy.ps1` - Tüm deployment'ı otomatikleştir
- ❌ `scripts/build-and-deploy.sh` - Frontend build + S3 sync + CloudFront invalidation

---

## 📦 Kurulum Adımları (Sıralı)

### Adım 1: Prerequisites
```bash
# Node.js 18+ kurulu olmalı
node --version

# AWS CLI kurulu ve configure edilmiş olmalı
aws --version
aws configure

# Terraform kurulu olmalı
terraform --version
```

### Adım 2: Frontend Dependencies
```bash
npm install
```

### Adım 3: Lambda Dependencies
```bash
cd lambda/translate-word
npm install
cd ../batch-translate
npm install
```

### Adım 4: Eksik Lambda Fonksiyonlarını Oluştur
```bash
# Grammar API Lambda'ları
mkdir -p lambda/get-grammar-lessons
mkdir -p lambda/get-grammar-lesson
mkdir -p lambda/get-grammar-quiz

# Vocabulary API Lambda
mkdir -p lambda/get-vocabulary-words

# Her biri için index.js ve package.json oluştur
```

### Adım 5: Terraform Yapılandırması
```bash
cd terraform
terraform init
terraform plan
terraform apply
```

**Not:** Terraform apply sonrası:
- API Gateway URL'i alınacak
- `.env` dosyası oluşturulacak

### Adım 6: Environment Variables
```bash
# .env dosyası oluştur (terraform output'tan API URL al)
echo "VITE_API_URL=https://<api-id>.execute-api.ca-central-1.amazonaws.com/prod" > .env
```

### Adım 7: DynamoDB Veri Yükleme
```bash
# Seed scripts çalıştır
node scripts/seed-grammar-lessons.js
node scripts/seed-vocabulary-words.js
node scripts/seed-grammar-quizzes.js
```

### Adım 8: Frontend Build & Deploy
```bash
# Build
npm run build

# S3'e yükle (terraform output'tan bucket name al)
aws s3 sync dist/ s3://<bucket-name> --delete

# CloudFront cache invalidation (terraform output'tan distribution-id al)
aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"
```

---

## 🔍 Kontrol Listesi

### Lambda Fonksiyonları
- [ ] translate-word ✅
- [ ] batch-translate ✅
- [ ] get-grammar-lessons ❌
- [ ] get-grammar-lesson ❌
- [ ] get-grammar-quiz ❌
- [ ] get-vocabulary-words ❌

### API Gateway Endpoints
- [ ] GET /translate/{word} ✅
- [ ] POST /translate/batch ✅
- [ ] GET /grammar/lessons ❌
- [ ] GET /grammar/lessons/{lessonId} ❌
- [ ] GET /grammar/quizzes/{quizId} ❌
- [ ] GET /vocabulary/words ❌

### Terraform Resources
- [ ] Lambda functions (translate-word, batch-translate) ✅
- [ ] Lambda functions (grammar, vocabulary) ❌
- [ ] API Gateway methods & integrations (translate) ✅
- [ ] API Gateway methods & integrations (grammar, vocabulary) ❌

### Data & Configuration
- [ ] DynamoDB tables ✅
- [ ] Seed data scripts ❌
- [ ] .env file ❌
- [ ] Environment variables (Lambda) ✅

---

## 🚀 Öncelik Sırası

1. **Yüksek Öncelik:**
   - Grammar & Vocabulary Lambda fonksiyonları
   - API Gateway method/integration'ları
   - Terraform güncellemeleri

2. **Orta Öncelik:**
   - DynamoDB seed data scripts
   - .env dosyası oluşturma
   - Deployment scripts

3. **Düşük Öncelik:**
   - CI/CD pipeline
   - Monitoring & Logging
   - Cognito authentication

---

## 📝 Notlar

- Lambda fonksiyonları için `aws-sdk` v2 kullanılıyor (Node.js 18.x)
- Terraform `excludes = ["node_modules"]` kullanıyor, bu yüzden önce npm install yapılmalı
- API Gateway URL'i Terraform apply sonrası `terraform output` ile alınacak
- CloudFront distribution oluşturulması 15-20 dakika sürebilir
- ACM certificate validation 5-10 dakika sürebilir


