# Tilgo AWS Infrastructure

Terraform configuration for deploying Tilgo English Learning Platform to AWS.

## Architecture

- **S3**: Static React website hosting
- **CloudFront**: CDN for fast content delivery
- **Route53**: DNS management (tilgo.cirak.ca)
- **API Gateway**: REST API endpoints
- **DynamoDB**: Data storage (grammar lessons, quizzes, vocabulary, translations cache)
- **Lambda**: Serverless functions for API
- **AWS Translate**: Real-time word translation with batch support

## Prerequisites

1. AWS CLI configured with credentials
2. Terraform >= 1.0 installed
3. Domain `cirak.ca` registered in Route53
4. Node.js 18+ (for Lambda functions)

## Setup

1. Configure variables in `terraform.tfvars`:
```hcl
aws_region  = "ca-central-1"
environment = "prod"
bucket_name = "tilgo-website-prod"
domain_name = "tilgo.cirak.ca"
root_domain = "cirak.ca"
```

**Note:** ACM certificate for CloudFront will be created in `us-east-1` (required by CloudFront), but all other resources will be in `ca-central-1`.

2. Initialize Terraform:
```bash
cd terraform
terraform init
```

3. Plan the deployment:
```bash
terraform plan
```

4. Apply the configuration:
```bash
terraform apply
```

## Certificate Validation

The ACM certificate will be automatically validated via Route53 DNS records. Terraform will:
1. Create the certificate in `us-east-1` (required for CloudFront)
2. Create DNS validation records in Route53
3. Wait for validation to complete

This process can take 5-10 minutes. Terraform will wait for validation before completing.

## Deploying Lambda Functions

### translate-word (Single word translation)

1. Install dependencies:
```bash
cd lambda/translate-word
npm install
```

2. Create deployment package:
```bash
zip -r function.zip index.js node_modules package.json
```

3. Deploy using AWS CLI:
```bash
aws lambda create-function \
  --function-name translate-word \
  --runtime nodejs18.x \
  --role arn:aws:iam::<account-id>:role/tilgo-lambda-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --region ca-central-1 \
  --environment Variables="{TRANSLATIONS_TABLE=word_translations}"
```

### batch-translate (Batch word translation)

1. Install dependencies:
```bash
cd lambda/batch-translate
npm install
```

2. Create deployment package:
```bash
zip -r function.zip index.js node_modules package.json
```

3. Deploy using AWS CLI:
```bash
aws lambda create-function \
  --function-name batch-translate \
  --runtime nodejs18.x \
  --role arn:aws:iam::<account-id>:role/tilgo-lambda-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --region ca-central-1 \
  --timeout 60 \
  --environment Variables="{TRANSLATIONS_TABLE=word_translations}"
```

**Note:** Use Terraform to deploy Lambda functions (recommended - add to main.tf).

## Deploying the React App

After infrastructure is created:

```bash
# Build the React app
npm run build

# Sync to S3
aws s3 sync dist/ s3://<bucket-name> --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"
```

## API Endpoints

The API Gateway will be available at:
- `https://<api-id>.execute-api.ca-central-1.amazonaws.com/prod/`

Endpoints:
- `GET /grammar/lessons` - List all grammar lessons
- `GET /grammar/lessons/{lessonId}` - Get specific lesson
- `GET /grammar/quizzes/{quizId}` - Get quiz
- `GET /vocabulary/words` - List vocabulary words
- `GET /vocabulary/words?word={word}` - Search word
- `GET /translate/{word}?target={lang}` - Translate single word (uses AWS Translate with DynamoDB cache)
- `POST /translate/batch` - Batch translate words from text (extracts words, checks cache, translates missing ones)

### Batch Translate Request
```json
{
  "text": "I work in a hospital. She plays tennis every weekend.",
  "targetLanguage": "tr"
}
```

### Batch Translate Response
```json
{
  "translations": [
    { "word": "work", "translation": "çalışmak", "source": "aws-translate" },
    { "word": "hospital", "translation": "hastane", "source": "cache" }
  ],
  "totalWords": 10,
  "cached": 5,
  "translated": 5
}
```

## DynamoDB Tables

### grammar_lessons
- Partition Key: `lessonId` (String)

### grammar_quizzes
- Partition Key: `quizId` (String)
- GSI: `lessonId-index`

### vocabulary_words
- Partition Key: `wordId` (String)
- GSI: `word-index`

### word_translations (Cache for AWS Translate)
- Partition Key: `word` (String, format: `{word}_{language}`)
- Attributes: `translation`, `sourceLanguage`, `targetLanguage`, `createdAt`, `usageCount`

## Translation Strategy

### Hybrid Approach

1. **Pre-load Translation (Batch)**
   - When a page loads (Grammar lesson, Vocabulary list)
   - Extract all words from content
   - Call batch translate API
   - Cache all translations in DynamoDB
   - User sees instant translations when clicking words

2. **On-Demand Translation (Single)**
   - User clicks a word not yet cached
   - Single word translate API called
   - Result cached for future use

3. **Benefits**
   - Fast UX (most words pre-translated)
   - Cost efficient (batch processing, cache-first)
   - Scalable (cache grows over time)

## Environment Variables

For React app, create `.env`:
```
VITE_API_URL=https://<api-id>.execute-api.ca-central-1.amazonaws.com/prod
```

## Next Steps

1. Complete Lambda function deployment via Terraform
2. Add Cognito for user authentication
3. Set up CI/CD pipeline
4. Add monitoring and logging (CloudWatch)
5. Set up backup strategy for DynamoDB
6. Add background job for popular words pre-translation
