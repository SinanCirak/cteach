terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Separate provider for ACM certificate (must be in us-east-1 for CloudFront)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# S3 Bucket for React static site
resource "aws_s3_bucket" "tilgo_website" {
  bucket = var.bucket_name

  tags = {
    Name        = "Tilgo Website"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_website_configuration" "tilgo_website" {
  bucket = aws_s3_bucket.tilgo_website.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "tilgo_website" {
  bucket = aws_s3_bucket.tilgo_website.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "tilgo_website" {
  bucket = aws_s3_bucket.tilgo_website.id
  versioning_configuration {
    status = "Enabled"
  }
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "tilgo_oai" {
  comment = "OAI for Tilgo website"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "tilgo_distribution" {
  origin {
    domain_name = aws_s3_bucket.tilgo_website.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.tilgo_website.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.tilgo_oai.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Tilgo website distribution"
  default_root_object = "index.html"

  aliases = [var.domain_name]

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.tilgo_website.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  # API Gateway origin for API calls
  origin {
    domain_name = replace(aws_api_gateway_stage.tilgo_api.invoke_url, "/^https?://([^/]+).*$/", "$1")
    origin_id   = "api-gateway"
    origin_path = "/prod"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Cache behavior for API calls - rewrite /api/prod/* to /prod/*
  ordered_cache_behavior {
    path_pattern     = "/api/prod/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "api-gateway"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type"]
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "https-only"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.tilgo_cert.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  tags = {
    Environment = var.environment
    Name        = "Tilgo Distribution"
  }
}

# S3 Bucket Policy for CloudFront
resource "aws_s3_bucket_policy" "tilgo_website_policy" {
  bucket = aws_s3_bucket.tilgo_website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAI"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.tilgo_oai.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.tilgo_website.arn}/*"
      }
    ]
  })
}

# ACM Certificate for HTTPS (must be in us-east-1 for CloudFront)
resource "aws_acm_certificate" "tilgo_cert" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = []

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "Tilgo Certificate"
  }
}

# Route53 validation record for certificate (in us-east-1)
resource "aws_route53_record" "cert_validation" {
  provider = aws.us_east_1
  for_each = {
    for dvo in aws_acm_certificate.tilgo_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Certificate validation
resource "aws_acm_certificate_validation" "tilgo_cert" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.tilgo_cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Route53 Zone (can be in any region, Route53 is global)
data "aws_route53_zone" "main" {
  name = var.root_domain
}

resource "aws_route53_record" "tilgo" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.tilgo_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.tilgo_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

# DynamoDB Tables
resource "aws_dynamodb_table" "grammar_lessons" {
  name           = "grammar_lessons"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "lessonId"

  attribute {
    name = "lessonId"
    type = "S"
  }

  tags = {
    Name        = "Grammar Lessons"
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "grammar_quizzes" {
  name           = "grammar_quizzes"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "quizId"

  attribute {
    name = "quizId"
    type = "S"
  }

  attribute {
    name = "lessonId"
    type = "S"
  }

  global_secondary_index {
    name     = "lessonId-index"
    hash_key = "lessonId"
    projection_type = "ALL"
  }

  tags = {
    Name        = "Grammar Quizzes"
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "vocabulary_words" {
  name           = "vocabulary_words"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "wordId"

  attribute {
    name = "wordId"
    type = "S"
  }

  attribute {
    name = "word"
    type = "S"
  }

  global_secondary_index {
    name     = "word-index"
    hash_key = "word"
    projection_type = "ALL"
  }

  tags = {
    Name        = "Vocabulary Words"
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "vocabulary_quizzes" {
  name           = "vocabulary_quizzes"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "quizId"

  attribute {
    name = "quizId"
    type = "S"
  }

  tags = {
    Name        = "Vocabulary Quizzes"
    Environment = var.environment
  }
}

# Word Translations Cache Table (for AWS Translate results)
resource "aws_dynamodb_table" "word_translations" {
  name           = "word_translations"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "word"

  attribute {
    name = "word"
    type = "S"
  }

  tags = {
    Name        = "Word Translations Cache"
    Environment = var.environment
  }
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "tilgo-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_dynamodb_policy" {
  name = "tilgo-lambda-dynamodb-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          aws_dynamodb_table.grammar_lessons.arn,
          "${aws_dynamodb_table.grammar_lessons.arn}/index/*",
          aws_dynamodb_table.grammar_quizzes.arn,
          "${aws_dynamodb_table.grammar_quizzes.arn}/index/*",
          aws_dynamodb_table.vocabulary_words.arn,
          "${aws_dynamodb_table.vocabulary_words.arn}/index/*",
          aws_dynamodb_table.vocabulary_quizzes.arn,
          aws_dynamodb_table.word_translations.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "translate:TranslateText"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Lambda deployment packages
data "archive_file" "translate_word_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/translate-word"
  output_path = "${path.module}/lambda-packages/translate-word.zip"
}

data "archive_file" "batch_translate_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/batch-translate"
  output_path = "${path.module}/lambda-packages/batch-translate.zip"
}

data "archive_file" "get_grammar_lessons_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/get-grammar-lessons"
  output_path = "${path.module}/lambda-packages/get-grammar-lessons.zip"
}

data "archive_file" "get_grammar_lesson_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/get-grammar-lesson"
  output_path = "${path.module}/lambda-packages/get-grammar-lesson.zip"
}

data "archive_file" "get_grammar_quiz_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/get-grammar-quiz"
  output_path = "${path.module}/lambda-packages/get-grammar-quiz.zip"
}

data "archive_file" "get_vocabulary_words_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/get-vocabulary-words"
  output_path = "${path.module}/lambda-packages/get-vocabulary-words.zip"
}

data "archive_file" "get_vocabulary_quiz_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/get-vocabulary-quiz"
  output_path = "${path.module}/lambda-packages/get-vocabulary-quiz.zip"
}

data "archive_file" "create_grammar_lesson_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/create-grammar-lesson"
  output_path = "${path.module}/lambda-packages/create-grammar-lesson.zip"
}

data "archive_file" "create_vocabulary_word_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/create-vocabulary-word"
  output_path = "${path.module}/lambda-packages/create-vocabulary-word.zip"
}

data "archive_file" "bulk_upload_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/bulk-upload"
  output_path = "${path.module}/lambda-packages/bulk-upload.zip"
}

data "archive_file" "create_grammar_quiz_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/create-grammar-quiz"
  output_path = "${path.module}/lambda-packages/create-grammar-quiz.zip"
}

data "archive_file" "create_vocabulary_quiz_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/create-vocabulary-quiz"
  output_path = "${path.module}/lambda-packages/create-vocabulary-quiz.zip"
}

data "archive_file" "cleanup_duplicates_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/cleanup-duplicates"
  output_path = "${path.module}/lambda-packages/cleanup-duplicates.zip"
}

# Lambda Functions
resource "aws_lambda_function" "translate_word" {
  filename         = data.archive_file.translate_word_zip.output_path
  function_name    = "tilgo-translate-word"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.translate_word_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      TRANSLATIONS_TABLE = aws_dynamodb_table.word_translations.name
    }
  }

  tags = {
    Name        = "Translate Word"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "batch_translate" {
  filename         = data.archive_file.batch_translate_zip.output_path
  function_name    = "tilgo-batch-translate"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.batch_translate_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 60

  environment {
    variables = {
      TRANSLATIONS_TABLE = aws_dynamodb_table.word_translations.name
    }
  }

  tags = {
    Name        = "Batch Translate"
    Environment = var.environment
  }
}

# Lambda permissions for API Gateway
resource "aws_lambda_permission" "translate_word_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.translate_word.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tilgo_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "batch_translate_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.batch_translate.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tilgo_api.execution_arn}/*/*"
}

resource "aws_lambda_function" "get_grammar_lessons" {
  filename         = data.archive_file.get_grammar_lessons_zip.output_path
  function_name    = "tilgo-get-grammar-lessons"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.get_grammar_lessons_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      GRAMMAR_LESSONS_TABLE = aws_dynamodb_table.grammar_lessons.name
    }
  }

  tags = {
    Name        = "Get Grammar Lessons"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "get_grammar_lesson" {
  filename         = data.archive_file.get_grammar_lesson_zip.output_path
  function_name    = "tilgo-get-grammar-lesson"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.get_grammar_lesson_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      GRAMMAR_LESSONS_TABLE = aws_dynamodb_table.grammar_lessons.name
    }
  }

  tags = {
    Name        = "Get Grammar Lesson"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "get_grammar_quiz" {
  filename         = data.archive_file.get_grammar_quiz_zip.output_path
  function_name    = "tilgo-get-grammar-quiz"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.get_grammar_quiz_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      GRAMMAR_QUIZZES_TABLE = aws_dynamodb_table.grammar_quizzes.name
    }
  }

  tags = {
    Name        = "Get Grammar Quiz"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "get_vocabulary_words" {
  filename         = data.archive_file.get_vocabulary_words_zip.output_path
  function_name    = "tilgo-get-vocabulary-words"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.get_vocabulary_words_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      VOCABULARY_WORDS_TABLE = aws_dynamodb_table.vocabulary_words.name
    }
  }

  tags = {
    Name        = "Get Vocabulary Words"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "get_vocabulary_quiz" {
  filename         = data.archive_file.get_vocabulary_quiz_zip.output_path
  function_name    = "tilgo-get-vocabulary-quiz"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.get_vocabulary_quiz_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      VOCABULARY_QUIZZES_TABLE = aws_dynamodb_table.vocabulary_quizzes.name
    }
  }

  tags = {
    Name        = "Get Vocabulary Quiz"
    Environment = var.environment
  }
}

resource "aws_lambda_permission" "get_vocabulary_quiz_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_vocabulary_quiz.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tilgo_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_grammar_lessons_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_grammar_lessons.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tilgo_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_grammar_lesson_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_grammar_lesson.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tilgo_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_grammar_quiz_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_grammar_quiz.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tilgo_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_vocabulary_words_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_vocabulary_words.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tilgo_api.execution_arn}/*/*"
}

# Admin Lambda Functions
resource "aws_lambda_function" "create_grammar_lesson" {
  filename         = data.archive_file.create_grammar_lesson_zip.output_path
  function_name    = "tilgo-create-grammar-lesson"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.create_grammar_lesson_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      GRAMMAR_LESSONS_TABLE = aws_dynamodb_table.grammar_lessons.name
    }
  }

  tags = {
    Name        = "Create Grammar Lesson"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "create_vocabulary_word" {
  filename         = data.archive_file.create_vocabulary_word_zip.output_path
  function_name    = "tilgo-create-vocabulary-word"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.create_vocabulary_word_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      VOCABULARY_WORDS_TABLE = aws_dynamodb_table.vocabulary_words.name
    }
  }

  tags = {
    Name        = "Create Vocabulary Word"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "bulk_upload" {
  filename         = data.archive_file.bulk_upload_zip.output_path
  function_name    = "tilgo-bulk-upload"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.bulk_upload_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 300

  environment {
    variables = {
      GRAMMAR_LESSONS_TABLE = aws_dynamodb_table.grammar_lessons.name
      VOCABULARY_WORDS_TABLE = aws_dynamodb_table.vocabulary_words.name
    }
  }

  tags = {
    Name        = "Bulk Upload"
    Environment = var.environment
  }
}

resource "aws_lambda_permission" "create_grammar_lesson_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_grammar_lesson.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tilgo_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "create_vocabulary_word_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_vocabulary_word.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tilgo_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "bulk_upload_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.bulk_upload.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tilgo_api.execution_arn}/*/*"
}

# Quiz Lambda Functions
resource "aws_lambda_function" "create_grammar_quiz" {
  filename         = data.archive_file.create_grammar_quiz_zip.output_path
  function_name    = "tilgo-create-grammar-quiz"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.create_grammar_quiz_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      GRAMMAR_QUIZZES_TABLE = aws_dynamodb_table.grammar_quizzes.name
    }
  }

  tags = {
    Name        = "Create Grammar Quiz"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "create_vocabulary_quiz" {
  filename         = data.archive_file.create_vocabulary_quiz_zip.output_path
  function_name    = "tilgo-create-vocabulary-quiz"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.create_vocabulary_quiz_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      VOCABULARY_QUIZZES_TABLE = aws_dynamodb_table.vocabulary_quizzes.name
    }
  }

  tags = {
    Name        = "Create Vocabulary Quiz"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "cleanup_duplicates" {
  filename         = data.archive_file.cleanup_duplicates_zip.output_path
  function_name    = "tilgo-cleanup-duplicates"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.cleanup_duplicates_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 60

  environment {
    variables = {
      GRAMMAR_LESSONS_TABLE = aws_dynamodb_table.grammar_lessons.name
      VOCABULARY_WORDS_TABLE = aws_dynamodb_table.vocabulary_words.name
    }
  }

  tags = {
    Name        = "Cleanup Duplicates"
    Environment = var.environment
  }
}

resource "aws_lambda_permission" "cleanup_duplicates_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cleanup_duplicates.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tilgo_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "create_grammar_quiz_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_grammar_quiz.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tilgo_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "create_vocabulary_quiz_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_vocabulary_quiz.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tilgo_api.execution_arn}/*/*"
}

# API Gateway
resource "aws_api_gateway_rest_api" "tilgo_api" {
  name        = "tilgo-api"
  description = "API for Tilgo English Learning Platform"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_deployment" "tilgo_api" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_rest_api.tilgo_api.body,
      aws_api_gateway_resource.grammar.id,
      aws_api_gateway_resource.vocabulary.id,
      aws_api_gateway_resource.translate.id,
      aws_api_gateway_resource.admin.id,
      aws_api_gateway_resource.admin_grammar_quiz.id,
      aws_api_gateway_resource.admin_vocabulary_quiz.id,
      aws_api_gateway_resource.admin_cleanup.id,
      aws_api_gateway_method.translate_word_get.id,
      aws_api_gateway_method.translate_batch_post.id,
      aws_api_gateway_method.grammar_lessons_get.id,
      aws_api_gateway_method.grammar_lesson_get.id,
      aws_api_gateway_method.grammar_quiz_get.id,
      aws_api_gateway_method.vocabulary_words_get.id,
      aws_api_gateway_method.vocabulary_quiz_get.id,
      aws_api_gateway_method.admin_grammar_post.id,
      aws_api_gateway_method.admin_vocabulary_post.id,
      aws_api_gateway_method.admin_bulk_post.id,
      aws_api_gateway_method.admin_grammar_quiz_post.id,
      aws_api_gateway_method.admin_vocabulary_quiz_post.id,
      aws_api_gateway_method.admin_cleanup_post.id,
      aws_lambda_function.translate_word.id,
      aws_lambda_function.batch_translate.id,
      aws_lambda_function.get_grammar_lessons.id,
      aws_lambda_function.get_grammar_lesson.id,
      aws_lambda_function.get_grammar_quiz.id,
      aws_lambda_function.get_vocabulary_words.id,
      aws_lambda_function.get_vocabulary_quiz.id,
      aws_lambda_function.create_grammar_lesson.id,
      aws_lambda_function.create_vocabulary_word.id,
      aws_lambda_function.bulk_upload.id,
      aws_lambda_function.create_grammar_quiz.id,
      aws_lambda_function.create_vocabulary_quiz.id,
      aws_lambda_function.cleanup_duplicates.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "tilgo_api" {
  deployment_id = aws_api_gateway_deployment.tilgo_api.id
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  stage_name    = var.environment
}

# API Gateway Resources
resource "aws_api_gateway_resource" "grammar" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  parent_id   = aws_api_gateway_rest_api.tilgo_api.root_resource_id
  path_part   = "grammar"
}

resource "aws_api_gateway_resource" "grammar_lessons" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  parent_id   = aws_api_gateway_resource.grammar.id
  path_part   = "lessons"
}

resource "aws_api_gateway_resource" "grammar_lesson" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  parent_id   = aws_api_gateway_resource.grammar_lessons.id
  path_part   = "{lessonId}"
}

resource "aws_api_gateway_resource" "grammar_quizzes" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  parent_id   = aws_api_gateway_resource.grammar.id
  path_part   = "quizzes"
}

resource "aws_api_gateway_resource" "grammar_quiz" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  parent_id   = aws_api_gateway_resource.grammar_quizzes.id
  path_part   = "{quizId}"
}

resource "aws_api_gateway_resource" "vocabulary" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  parent_id   = aws_api_gateway_rest_api.tilgo_api.root_resource_id
  path_part   = "vocabulary"
}

resource "aws_api_gateway_resource" "vocabulary_words" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  parent_id   = aws_api_gateway_resource.vocabulary.id
  path_part   = "words"
}

resource "aws_api_gateway_resource" "vocabulary_quizzes" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  parent_id   = aws_api_gateway_resource.vocabulary.id
  path_part   = "quizzes"
}

resource "aws_api_gateway_resource" "vocabulary_quiz" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  parent_id   = aws_api_gateway_resource.vocabulary_quizzes.id
  path_part   = "{quizId}"
}

# Translate endpoint
resource "aws_api_gateway_resource" "translate" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  parent_id   = aws_api_gateway_rest_api.tilgo_api.root_resource_id
  path_part   = "translate"
}

resource "aws_api_gateway_resource" "translate_word" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  parent_id   = aws_api_gateway_resource.translate.id
  path_part   = "{word}"
}

resource "aws_api_gateway_resource" "translate_batch" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  parent_id   = aws_api_gateway_resource.translate.id
  path_part   = "batch"
}

# Admin API Resources
resource "aws_api_gateway_resource" "admin" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  parent_id   = aws_api_gateway_rest_api.tilgo_api.root_resource_id
  path_part   = "admin"
}

resource "aws_api_gateway_resource" "admin_grammar" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "grammar"
}

resource "aws_api_gateway_resource" "admin_vocabulary" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "vocabulary"
}

resource "aws_api_gateway_resource" "admin_bulk" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "bulk"
}

resource "aws_api_gateway_resource" "admin_grammar_quiz" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  parent_id   = aws_api_gateway_resource.admin_grammar.id
  path_part   = "quiz"
}

resource "aws_api_gateway_resource" "admin_vocabulary_quiz" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  parent_id   = aws_api_gateway_resource.admin_vocabulary.id
  path_part   = "quiz"
}

resource "aws_api_gateway_resource" "admin_cleanup" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "cleanup"
}

# CORS Configuration
resource "aws_api_gateway_method" "grammar_lessons_options" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.grammar_lessons.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "grammar_lessons_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.grammar_lessons.id
  http_method = aws_api_gateway_method.grammar_lessons_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "grammar_lessons_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.grammar_lessons.id
  http_method = aws_api_gateway_method.grammar_lessons_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "grammar_lessons_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.grammar_lessons.id
  http_method = aws_api_gateway_method.grammar_lessons_options.http_method
  status_code = aws_api_gateway_method_response.grammar_lessons_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Grammar Lessons GET
resource "aws_api_gateway_method" "grammar_lessons_get" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.grammar_lessons.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "grammar_lessons_get" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.grammar_lessons.id
  http_method = aws_api_gateway_method.grammar_lessons_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_grammar_lessons.invoke_arn
}

# Grammar Lesson GET
resource "aws_api_gateway_method" "grammar_lesson_get" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.grammar_lesson.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "grammar_lesson_get" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.grammar_lesson.id
  http_method = aws_api_gateway_method.grammar_lesson_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_grammar_lesson.invoke_arn
}

resource "aws_api_gateway_method" "grammar_lesson_options" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.grammar_lesson.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "grammar_lesson_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.grammar_lesson.id
  http_method = aws_api_gateway_method.grammar_lesson_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "grammar_lesson_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.grammar_lesson.id
  http_method = aws_api_gateway_method.grammar_lesson_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "grammar_lesson_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.grammar_lesson.id
  http_method = aws_api_gateway_method.grammar_lesson_options.http_method
  status_code = aws_api_gateway_method_response.grammar_lesson_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Grammar Quiz GET
resource "aws_api_gateway_method" "grammar_quiz_get" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.grammar_quiz.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "grammar_quiz_get" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.grammar_quiz.id
  http_method = aws_api_gateway_method.grammar_quiz_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_grammar_quiz.invoke_arn
}

resource "aws_api_gateway_method" "grammar_quiz_options" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.grammar_quiz.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "grammar_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.grammar_quiz.id
  http_method = aws_api_gateway_method.grammar_quiz_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "grammar_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.grammar_quiz.id
  http_method = aws_api_gateway_method.grammar_quiz_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "grammar_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.grammar_quiz.id
  http_method = aws_api_gateway_method.grammar_quiz_options.http_method
  status_code = aws_api_gateway_method_response.grammar_quiz_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Vocabulary Words GET
resource "aws_api_gateway_method" "vocabulary_words_get" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.vocabulary_words.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "vocabulary_words_get" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.vocabulary_words.id
  http_method = aws_api_gateway_method.vocabulary_words_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_vocabulary_words.invoke_arn
}

resource "aws_api_gateway_method" "vocabulary_words_options" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.vocabulary_words.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "vocabulary_words_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.vocabulary_words.id
  http_method = aws_api_gateway_method.vocabulary_words_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "vocabulary_words_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.vocabulary_words.id
  http_method = aws_api_gateway_method.vocabulary_words_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "vocabulary_words_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.vocabulary_words.id
  http_method = aws_api_gateway_method.vocabulary_words_options.http_method
  status_code = aws_api_gateway_method_response.vocabulary_words_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Vocabulary Quiz GET
resource "aws_api_gateway_method" "vocabulary_quiz_get" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.vocabulary_quiz.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "vocabulary_quiz_get" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.vocabulary_quiz.id
  http_method = aws_api_gateway_method.vocabulary_quiz_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_vocabulary_quiz.invoke_arn
}

resource "aws_api_gateway_method" "vocabulary_quiz_options" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.vocabulary_quiz.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "vocabulary_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.vocabulary_quiz.id
  http_method = aws_api_gateway_method.vocabulary_quiz_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "vocabulary_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.vocabulary_quiz.id
  http_method = aws_api_gateway_method.vocabulary_quiz_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "vocabulary_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.vocabulary_quiz.id
  http_method = aws_api_gateway_method.vocabulary_quiz_options.http_method
  status_code = aws_api_gateway_method_response.vocabulary_quiz_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Translate Word Endpoint
resource "aws_api_gateway_method" "translate_word_get" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.translate_word.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "translate_word_get" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.translate_word.id
  http_method = aws_api_gateway_method.translate_word_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.translate_word.invoke_arn
}

resource "aws_api_gateway_method" "translate_word_options" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.translate_word.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "translate_word_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.translate_word.id
  http_method = aws_api_gateway_method.translate_word_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "translate_word_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.translate_word.id
  http_method = aws_api_gateway_method.translate_word_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "translate_word_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.translate_word.id
  http_method = aws_api_gateway_method.translate_word_options.http_method
  status_code = aws_api_gateway_method_response.translate_word_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Batch Translate Endpoint
resource "aws_api_gateway_method" "translate_batch_post" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.translate_batch.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "translate_batch_post" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.translate_batch.id
  http_method = aws_api_gateway_method.translate_batch_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.batch_translate.invoke_arn
}

resource "aws_api_gateway_method" "translate_batch_options" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.translate_batch.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "translate_batch_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.translate_batch.id
  http_method = aws_api_gateway_method.translate_batch_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "translate_batch_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.translate_batch.id
  http_method = aws_api_gateway_method.translate_batch_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "translate_batch_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.translate_batch.id
  http_method = aws_api_gateway_method.translate_batch_options.http_method
  status_code = aws_api_gateway_method_response.translate_batch_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Admin API Endpoints - Create Grammar Lesson
resource "aws_api_gateway_method" "admin_grammar_post" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.admin_grammar.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_grammar_post" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_grammar.id
  http_method = aws_api_gateway_method.admin_grammar_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_grammar_lesson.invoke_arn
}

resource "aws_api_gateway_method" "admin_grammar_options" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.admin_grammar.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_grammar_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_grammar.id
  http_method = aws_api_gateway_method.admin_grammar_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_grammar_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_grammar.id
  http_method = aws_api_gateway_method.admin_grammar_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "admin_grammar_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_grammar.id
  http_method = aws_api_gateway_method.admin_grammar_options.http_method
  status_code = aws_api_gateway_method_response.admin_grammar_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Admin API Endpoints - Create Vocabulary Word
resource "aws_api_gateway_method" "admin_vocabulary_post" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.admin_vocabulary.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_vocabulary_post" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_vocabulary.id
  http_method = aws_api_gateway_method.admin_vocabulary_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_vocabulary_word.invoke_arn
}

resource "aws_api_gateway_method" "admin_vocabulary_options" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.admin_vocabulary.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_vocabulary_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_vocabulary.id
  http_method = aws_api_gateway_method.admin_vocabulary_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_vocabulary_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_vocabulary.id
  http_method = aws_api_gateway_method.admin_vocabulary_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "admin_vocabulary_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_vocabulary.id
  http_method = aws_api_gateway_method.admin_vocabulary_options.http_method
  status_code = aws_api_gateway_method_response.admin_vocabulary_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Admin API Endpoints - Bulk Upload
resource "aws_api_gateway_method" "admin_bulk_post" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.admin_bulk.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_bulk_post" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_bulk.id
  http_method = aws_api_gateway_method.admin_bulk_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.bulk_upload.invoke_arn
}

resource "aws_api_gateway_method" "admin_bulk_options" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.admin_bulk.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_bulk_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_bulk.id
  http_method = aws_api_gateway_method.admin_bulk_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_bulk_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_bulk.id
  http_method = aws_api_gateway_method.admin_bulk_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "admin_bulk_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_bulk.id
  http_method = aws_api_gateway_method.admin_bulk_options.http_method
  status_code = aws_api_gateway_method_response.admin_bulk_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Admin API Endpoints - Create Grammar Quiz
resource "aws_api_gateway_method" "admin_grammar_quiz_post" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.admin_grammar_quiz.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_grammar_quiz_post" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_grammar_quiz.id
  http_method = aws_api_gateway_method.admin_grammar_quiz_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_grammar_quiz.invoke_arn
}

resource "aws_api_gateway_method" "admin_grammar_quiz_options" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.admin_grammar_quiz.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_grammar_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_grammar_quiz.id
  http_method = aws_api_gateway_method.admin_grammar_quiz_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_grammar_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_grammar_quiz.id
  http_method = aws_api_gateway_method.admin_grammar_quiz_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "admin_grammar_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_grammar_quiz.id
  http_method = aws_api_gateway_method.admin_grammar_quiz_options.http_method
  status_code = aws_api_gateway_method_response.admin_grammar_quiz_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Admin API Endpoints - Create Vocabulary Quiz
resource "aws_api_gateway_method" "admin_vocabulary_quiz_post" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.admin_vocabulary_quiz.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_vocabulary_quiz_post" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_vocabulary_quiz.id
  http_method = aws_api_gateway_method.admin_vocabulary_quiz_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_vocabulary_quiz.invoke_arn
}

resource "aws_api_gateway_method" "admin_vocabulary_quiz_options" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.admin_vocabulary_quiz.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_vocabulary_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_vocabulary_quiz.id
  http_method = aws_api_gateway_method.admin_vocabulary_quiz_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_vocabulary_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_vocabulary_quiz.id
  http_method = aws_api_gateway_method.admin_vocabulary_quiz_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "admin_vocabulary_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_vocabulary_quiz.id
  http_method = aws_api_gateway_method.admin_vocabulary_quiz_options.http_method
  status_code = aws_api_gateway_method_response.admin_vocabulary_quiz_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Admin API Endpoints - Cleanup Duplicates
resource "aws_api_gateway_method" "admin_cleanup_post" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.admin_cleanup.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_cleanup_post" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_cleanup.id
  http_method = aws_api_gateway_method.admin_cleanup_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.cleanup_duplicates.invoke_arn
}

resource "aws_api_gateway_method" "admin_cleanup_options" {
  rest_api_id   = aws_api_gateway_rest_api.tilgo_api.id
  resource_id   = aws_api_gateway_resource.admin_cleanup.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_cleanup_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_cleanup.id
  http_method = aws_api_gateway_method.admin_cleanup_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_cleanup_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_cleanup.id
  http_method = aws_api_gateway_method.admin_cleanup_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "admin_cleanup_options" {
  rest_api_id = aws_api_gateway_rest_api.tilgo_api.id
  resource_id = aws_api_gateway_resource.admin_cleanup.id
  http_method = aws_api_gateway_method.admin_cleanup_options.http_method
  status_code = aws_api_gateway_method_response.admin_cleanup_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

