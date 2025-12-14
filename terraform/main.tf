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
resource "aws_s3_bucket" "cteach_website" {
  bucket = var.bucket_name

  tags = {
    Name        = "cteach Website"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_website_configuration" "cteach_website" {
  bucket = aws_s3_bucket.cteach_website.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "cteach_website" {
  bucket = aws_s3_bucket.cteach_website.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "cteach_website" {
  bucket = aws_s3_bucket.cteach_website.id
  versioning_configuration {
    status = "Enabled"
  }
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "cteach_oai" {
  comment = "OAI for cteach website"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "cteach_distribution" {
  origin {
    domain_name = aws_s3_bucket.cteach_website.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.cteach_website.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.cteach_oai.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "cteach website distribution"
  default_root_object = "index.html"

  aliases = [var.domain_name]

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.cteach_website.id}"

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
    domain_name = replace(aws_api_gateway_stage.cteach_api.invoke_url, "/^https?://([^/]+).*$/", "$1")
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
    acm_certificate_arn      = aws_acm_certificate_validation.cteach_cert.certificate_arn
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
    Name        = "cteach Distribution"
  }
}

# S3 Bucket Policy for CloudFront
resource "aws_s3_bucket_policy" "cteach_website_policy" {
  bucket = aws_s3_bucket.cteach_website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAI"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.cteach_oai.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.cteach_website.arn}/*"
      }
    ]
  })
}

# ACM Certificate for HTTPS (must be in us-east-1 for CloudFront)
resource "aws_acm_certificate" "cteach_cert" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = []

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "cteach Certificate"
  }
}

# Route53 validation record for certificate (in us-east-1)
resource "aws_route53_record" "cert_validation" {
  provider = aws.us_east_1
  for_each = {
    for dvo in aws_acm_certificate.cteach_cert.domain_validation_options : dvo.domain_name => {
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
resource "aws_acm_certificate_validation" "cteach_cert" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.cteach_cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Route53 Zone (can be in any region, Route53 is global)
data "aws_route53_zone" "main" {
  name = var.root_domain
}

resource "aws_route53_record" "cteach" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.cteach_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.cteach_distribution.hosted_zone_id
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

resource "aws_dynamodb_table" "terms" {
  name           = "terms"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "termId"

  attribute {
    name = "termId"
    type = "S"
  }

  attribute {
    name = "term"
    type = "S"
  }

  global_secondary_index {
    name     = "term-index"
    hash_key = "term"
    projection_type = "ALL"
  }

  tags = {
    Name        = "Terms"
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "terms_quizzes" {
  name           = "terms_quizzes"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "quizId"

  attribute {
    name = "quizId"
    type = "S"
  }

  tags = {
    Name        = "Terms Quizzes"
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

# Levels Table (for managing difficulty levels)
resource "aws_dynamodb_table" "levels" {
  name           = "levels"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "levelId"

  attribute {
    name = "levelId"
    type = "S"
  }

  attribute {
    name = "order"
    type = "N"
  }

  global_secondary_index {
    name     = "order-index"
    hash_key = "order"
    projection_type = "ALL"
  }

  tags = {
    Name        = "Levels"
    Environment = var.environment
  }
}

# Categories Table (for managing subjects like Math, Physics, Languages, etc.)
resource "aws_dynamodb_table" "categories" {
  name           = "categories"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "categoryId"

  attribute {
    name = "categoryId"
    type = "S"
  }

  tags = {
    Name        = "Categories"
    Environment = var.environment
  }
}

# App Configuration Table
resource "aws_dynamodb_table" "app_config" {
  name           = "app_config"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "configKey"

  attribute {
    name = "configKey"
    type = "S"
  }

  tags = {
    Name        = "App Configuration"
    Environment = var.environment
  }
}

# S3 Bucket for Images
resource "aws_s3_bucket" "cteach_images" {
  bucket = "${var.bucket_name}-images"

  tags = {
    Name        = "cteach Images"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "cteach_images" {
  bucket = aws_s3_bucket.cteach_images.id

  block_public_acls       = true
  block_public_policy    = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "cteach_images" {
  bucket = aws_s3_bucket.cteach_images.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_cors_configuration" "cteach_images" {
  bucket = aws_s3_bucket.cteach_images.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "cteach-lambda-role"

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
  name = "cteach-lambda-dynamodb-policy"
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
          aws_dynamodb_table.terms.arn,
          "${aws_dynamodb_table.terms.arn}/index/*",
          aws_dynamodb_table.terms_quizzes.arn,
          aws_dynamodb_table.word_translations.arn,
          aws_dynamodb_table.levels.arn,
          "${aws_dynamodb_table.levels.arn}/index/*",
          aws_dynamodb_table.categories.arn,
          aws_dynamodb_table.app_config.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.cteach_images.arn,
          "${aws_s3_bucket.cteach_images.arn}/*"
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

data "archive_file" "get_lessons_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/get-lessons"
  output_path = "${path.module}/lambda-packages/get-lessons.zip"
}

data "archive_file" "get_lesson_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/get-lesson"
  output_path = "${path.module}/lambda-packages/get-lesson.zip"
}

data "archive_file" "get_lesson_quiz_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/get-lesson-quiz"
  output_path = "${path.module}/lambda-packages/get-lesson-quiz.zip"
}

data "archive_file" "get_terms_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/get-terms"
  output_path = "${path.module}/lambda-packages/get-terms.zip"
}

data "archive_file" "get_terms_quiz_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/get-terms-quiz"
  output_path = "${path.module}/lambda-packages/get-terms-quiz.zip"
}

data "archive_file" "create_lesson_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/create-lesson"
  output_path = "${path.module}/lambda-packages/create-lesson.zip"
}

data "archive_file" "create_term_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/create-term"
  output_path = "${path.module}/lambda-packages/create-term.zip"
}

data "archive_file" "bulk_upload_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/bulk-upload"
  output_path = "${path.module}/lambda-packages/bulk-upload.zip"
}

data "archive_file" "create_lesson_quiz_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/create-lesson-quiz"
  output_path = "${path.module}/lambda-packages/create-lesson-quiz.zip"
}

data "archive_file" "create_terms_quiz_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/create-terms-quiz"
  output_path = "${path.module}/lambda-packages/create-terms-quiz.zip"
}

data "archive_file" "cleanup_duplicates_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/cleanup-duplicates"
  output_path = "${path.module}/lambda-packages/cleanup-duplicates.zip"
}

data "archive_file" "manage_levels_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/manage-levels"
  output_path = "${path.module}/lambda-packages/manage-levels.zip"
}

data "archive_file" "manage_categories_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/manage-categories"
  output_path = "${path.module}/lambda-packages/manage-categories.zip"
}

data "archive_file" "upload_image_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/upload-image"
  output_path = "${path.module}/lambda-packages/upload-image.zip"
}

data "archive_file" "get_app_config_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/get-app-config"
  output_path = "${path.module}/lambda-packages/get-app-config.zip"
}

# Lambda Functions
resource "aws_lambda_function" "translate_word" {
  filename         = data.archive_file.translate_word_zip.output_path
  function_name    = "cteach-translate-word"
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
  function_name    = "cteach-batch-translate"
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
  source_arn    = "${aws_api_gateway_rest_api.cteach_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "batch_translate_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.batch_translate.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.cteach_api.execution_arn}/*/*"
}

resource "aws_lambda_function" "get_lessons" {
  filename         = data.archive_file.get_lessons_zip.output_path
  function_name    = "cteach-get-lessons"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.get_lessons_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      GRAMMAR_LESSONS_TABLE = aws_dynamodb_table.grammar_lessons.name
    }
  }

  tags = {
    Name        = "Get Lessons"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "get_lesson" {
  filename         = data.archive_file.get_lesson_zip.output_path
  function_name    = "cteach-get-lesson"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.get_lesson_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      GRAMMAR_LESSONS_TABLE = aws_dynamodb_table.grammar_lessons.name
    }
  }

  tags = {
    Name        = "Get Lesson"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "get_lesson_quiz" {
  filename         = data.archive_file.get_lesson_quiz_zip.output_path
  function_name    = "cteach-get-lesson-quiz"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.get_lesson_quiz_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      GRAMMAR_QUIZZES_TABLE = aws_dynamodb_table.grammar_quizzes.name
    }
  }

  tags = {
    Name        = "Get Lesson Quiz"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "get_terms" {
  filename         = data.archive_file.get_terms_zip.output_path
  function_name    = "cteach-get-terms"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.get_terms_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      TERMS_TABLE = aws_dynamodb_table.terms.name
    }
  }

  tags = {
    Name        = "Get Terms"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "get_terms_quiz" {
  filename         = data.archive_file.get_terms_quiz_zip.output_path
  function_name    = "cteach-get-terms-quiz"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.get_terms_quiz_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      TERMS_QUIZZES_TABLE = aws_dynamodb_table.terms_quizzes.name
    }
  }

  tags = {
    Name        = "Get Terms Quiz"
    Environment = var.environment
  }
}

resource "aws_lambda_permission" "get_terms_quiz_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_terms_quiz.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.cteach_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_lessons_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_lessons.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.cteach_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_lesson_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_lesson.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.cteach_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_lesson_quiz_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_lesson_quiz.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.cteach_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_terms_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_terms.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.cteach_api.execution_arn}/*/*"
}

# Admin Lambda Functions
resource "aws_lambda_function" "create_lesson" {
  filename         = data.archive_file.create_lesson_zip.output_path
  function_name    = "cteach-create-lesson"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.create_lesson_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      GRAMMAR_LESSONS_TABLE = aws_dynamodb_table.grammar_lessons.name
    }
  }

  tags = {
    Name        = "Create Lesson"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "create_term" {
  filename         = data.archive_file.create_term_zip.output_path
  function_name    = "cteach-create-term"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.create_term_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      TERMS_TABLE = aws_dynamodb_table.terms.name
    }
  }

  tags = {
    Name        = "Create Term"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "bulk_upload" {
  filename         = data.archive_file.bulk_upload_zip.output_path
  function_name    = "cteach-bulk-upload"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.bulk_upload_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 300

  environment {
    variables = {
      GRAMMAR_LESSONS_TABLE = aws_dynamodb_table.grammar_lessons.name
      TERMS_TABLE = aws_dynamodb_table.terms.name
    }
  }

  tags = {
    Name        = "Bulk Upload"
    Environment = var.environment
  }
}

resource "aws_lambda_permission" "create_lesson_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_lesson.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.cteach_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "create_term_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_term.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.cteach_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "bulk_upload_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.bulk_upload.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.cteach_api.execution_arn}/*/*"
}

# Quiz Lambda Functions
resource "aws_lambda_function" "create_lesson_quiz" {
  filename         = data.archive_file.create_lesson_quiz_zip.output_path
  function_name    = "cteach-create-lesson-quiz"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.create_lesson_quiz_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      GRAMMAR_QUIZZES_TABLE = aws_dynamodb_table.grammar_quizzes.name
    }
  }

  tags = {
    Name        = "Create Lesson Quiz"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "create_terms_quiz" {
  filename         = data.archive_file.create_terms_quiz_zip.output_path
  function_name    = "cteach-create-terms-quiz"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.create_terms_quiz_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      TERMS_QUIZZES_TABLE = aws_dynamodb_table.terms_quizzes.name
    }
  }

  tags = {
    Name        = "Create Terms Quiz"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "cleanup_duplicates" {
  filename         = data.archive_file.cleanup_duplicates_zip.output_path
  function_name    = "cteach-cleanup-duplicates"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.cleanup_duplicates_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 60

  environment {
    variables = {
      GRAMMAR_LESSONS_TABLE = aws_dynamodb_table.grammar_lessons.name
      TERMS_TABLE = aws_dynamodb_table.terms.name
    }
  }

  tags = {
    Name        = "Cleanup Duplicates"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "manage_levels" {
  filename         = data.archive_file.manage_levels_zip.output_path
  function_name    = "cteach-manage-levels"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.manage_levels_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      LEVELS_TABLE = aws_dynamodb_table.levels.name
    }
  }

  tags = {
    Name        = "Manage Levels"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "manage_categories" {
  filename         = data.archive_file.manage_categories_zip.output_path
  function_name    = "cteach-manage-categories"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.manage_categories_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      CATEGORIES_TABLE = aws_dynamodb_table.categories.name
    }
  }

  tags = {
    Name        = "Manage Categories"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "upload_image" {
  filename         = data.archive_file.upload_image_zip.output_path
  function_name    = "cteach-upload-image"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.upload_image_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      IMAGES_BUCKET = aws_s3_bucket.cteach_images.id
      AWS_REGION    = var.aws_region
    }
  }

  tags = {
    Name        = "Upload Image"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "get_app_config" {
  filename         = data.archive_file.get_app_config_zip.output_path
  function_name    = "cteach-get-app-config"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.get_app_config_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      APP_CONFIG_TABLE = aws_dynamodb_table.app_config.name
    }
  }

  tags = {
    Name        = "Get App Config"
    Environment = var.environment
  }
}

resource "aws_lambda_permission" "cleanup_duplicates_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cleanup_duplicates.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.cteach_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "manage_levels_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.manage_levels.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.cteach_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "manage_categories_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.manage_categories.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.cteach_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "upload_image_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.upload_image.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.cteach_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_app_config_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_app_config.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.cteach_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "create_lesson_quiz_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_lesson_quiz.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.cteach_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "create_terms_quiz_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_terms_quiz.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.cteach_api.execution_arn}/*/*"
}

# API Gateway
resource "aws_api_gateway_rest_api" "cteach_api" {
  name        = "cteach-api"
  description = "API for cteach Learning Platform"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_deployment" "cteach_api" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_rest_api.cteach_api.body,
      aws_api_gateway_resource.grammar.id,
      aws_api_gateway_resource.terms.id,
      aws_api_gateway_resource.translate.id,
      aws_api_gateway_resource.admin.id,
      aws_api_gateway_resource.admin_grammar_quiz.id,
      aws_api_gateway_resource.admin_terms_quiz.id,
      aws_api_gateway_resource.admin_cleanup.id,
      aws_api_gateway_resource.admin_levels.id,
      aws_api_gateway_resource.admin_level.id,
      aws_api_gateway_resource.admin_categories.id,
      aws_api_gateway_resource.admin_category.id,
      aws_api_gateway_resource.admin_upload_image.id,
      aws_api_gateway_resource.app_config.id,
      aws_api_gateway_method.translate_word_get.id,
      aws_api_gateway_method.translate_batch_post.id,
      aws_api_gateway_method.grammar_lessons_get.id,
      aws_api_gateway_method.grammar_lesson_get.id,
      aws_api_gateway_method.grammar_quiz_get.id,
      aws_api_gateway_method.terms_get.id,
      aws_api_gateway_method.terms_quiz_get.id,
      aws_api_gateway_method.admin_grammar_post.id,
      aws_api_gateway_method.admin_terms_post.id,
      aws_api_gateway_method.admin_bulk_post.id,
      aws_api_gateway_method.admin_grammar_quiz_post.id,
      aws_api_gateway_method.admin_terms_quiz_post.id,
      aws_api_gateway_method.admin_cleanup_post.id,
      aws_api_gateway_method.admin_levels_get.id,
      aws_api_gateway_method.admin_levels_post.id,
      aws_api_gateway_method.admin_level_put.id,
      aws_api_gateway_method.admin_level_delete.id,
      aws_api_gateway_method.admin_categories_get.id,
      aws_api_gateway_method.admin_categories_post.id,
      aws_api_gateway_method.admin_category_put.id,
      aws_api_gateway_method.admin_category_delete.id,
      aws_api_gateway_method.admin_upload_image_post.id,
      aws_api_gateway_method.app_config_get.id,
      aws_api_gateway_method.app_config_post.id,
      aws_lambda_function.translate_word.id,
      aws_lambda_function.batch_translate.id,
      aws_lambda_function.get_lessons.id,
      aws_lambda_function.get_lesson.id,
      aws_lambda_function.get_lesson_quiz.id,
      aws_lambda_function.get_terms.id,
      aws_lambda_function.get_terms_quiz.id,
      aws_lambda_function.create_lesson.id,
      aws_lambda_function.create_term.id,
      aws_lambda_function.bulk_upload.id,
      aws_lambda_function.create_lesson_quiz.id,
      aws_lambda_function.create_terms_quiz.id,
      aws_lambda_function.cleanup_duplicates.id,
      aws_lambda_function.manage_levels.id,
      aws_lambda_function.manage_categories.id,
      aws_lambda_function.upload_image.id,
      aws_lambda_function.get_app_config.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "cteach_api" {
  deployment_id = aws_api_gateway_deployment.cteach_api.id
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  stage_name    = var.environment
}

# API Gateway Resources
resource "aws_api_gateway_resource" "grammar" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_rest_api.cteach_api.root_resource_id
  path_part   = "grammar"
}

resource "aws_api_gateway_resource" "grammar_lessons" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_resource.grammar.id
  path_part   = "lessons"
}

resource "aws_api_gateway_resource" "grammar_lesson" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_resource.grammar_lessons.id
  path_part   = "{lessonId}"
}

resource "aws_api_gateway_resource" "grammar_quizzes" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_resource.grammar.id
  path_part   = "quizzes"
}

resource "aws_api_gateway_resource" "grammar_quiz" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_resource.grammar_quizzes.id
  path_part   = "{quizId}"
}

resource "aws_api_gateway_resource" "terms" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_rest_api.cteach_api.root_resource_id
  path_part   = "terms"
}

resource "aws_api_gateway_resource" "terms_list" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_resource.terms.id
  path_part   = "list"
}

resource "aws_api_gateway_resource" "terms_quizzes" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_resource.terms.id
  path_part   = "quizzes"
}

resource "aws_api_gateway_resource" "terms_quiz" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_resource.terms_quizzes.id
  path_part   = "{quizId}"
}

# Translate endpoint
resource "aws_api_gateway_resource" "translate" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_rest_api.cteach_api.root_resource_id
  path_part   = "translate"
}

resource "aws_api_gateway_resource" "translate_word" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_resource.translate.id
  path_part   = "{word}"
}

resource "aws_api_gateway_resource" "translate_batch" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_resource.translate.id
  path_part   = "batch"
}

# Admin API Resources
resource "aws_api_gateway_resource" "admin" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_rest_api.cteach_api.root_resource_id
  path_part   = "admin"
}

resource "aws_api_gateway_resource" "admin_grammar" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "grammar"
}

resource "aws_api_gateway_resource" "admin_terms" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "terms"
}

resource "aws_api_gateway_resource" "admin_bulk" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "bulk"
}

resource "aws_api_gateway_resource" "admin_grammar_quiz" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_resource.admin_grammar.id
  path_part   = "quiz"
}

resource "aws_api_gateway_resource" "admin_terms_quiz" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_resource.admin_terms.id
  path_part   = "quiz"
}

resource "aws_api_gateway_resource" "admin_cleanup" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "cleanup"
}

resource "aws_api_gateway_resource" "admin_levels" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "levels"
}

resource "aws_api_gateway_resource" "admin_level" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_resource.admin_levels.id
  path_part   = "{levelId}"
}

resource "aws_api_gateway_resource" "admin_categories" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "categories"
}

resource "aws_api_gateway_resource" "admin_category" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_resource.admin_categories.id
  path_part   = "{categoryId}"
}

resource "aws_api_gateway_resource" "admin_upload_image" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "upload-image"
}

resource "aws_api_gateway_resource" "app_config" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  parent_id   = aws_api_gateway_rest_api.cteach_api.root_resource_id
  path_part   = "config"
}

# CORS Configuration
resource "aws_api_gateway_method" "grammar_lessons_options" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.grammar_lessons.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "grammar_lessons_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.grammar_lessons.id
  http_method = aws_api_gateway_method.grammar_lessons_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "grammar_lessons_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
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
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
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
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.grammar_lessons.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "grammar_lessons_get" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.grammar_lessons.id
  http_method = aws_api_gateway_method.grammar_lessons_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_lessons.invoke_arn
}

# Grammar Lesson GET
resource "aws_api_gateway_method" "grammar_lesson_get" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.grammar_lesson.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "grammar_lesson_get" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.grammar_lesson.id
  http_method = aws_api_gateway_method.grammar_lesson_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_lesson.invoke_arn
}

resource "aws_api_gateway_method" "grammar_lesson_options" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.grammar_lesson.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "grammar_lesson_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.grammar_lesson.id
  http_method = aws_api_gateway_method.grammar_lesson_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "grammar_lesson_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
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
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
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
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.grammar_quiz.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "grammar_quiz_get" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.grammar_quiz.id
  http_method = aws_api_gateway_method.grammar_quiz_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_lesson_quiz.invoke_arn
}

resource "aws_api_gateway_method" "grammar_quiz_options" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.grammar_quiz.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "grammar_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.grammar_quiz.id
  http_method = aws_api_gateway_method.grammar_quiz_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "grammar_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
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
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.grammar_quiz.id
  http_method = aws_api_gateway_method.grammar_quiz_options.http_method
  status_code = aws_api_gateway_method_response.grammar_quiz_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Terms GET
resource "aws_api_gateway_method" "terms_get" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.terms.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "terms_get" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.terms.id
  http_method = aws_api_gateway_method.terms_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_terms.invoke_arn
}

resource "aws_api_gateway_method" "terms_options" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.terms.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "terms_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.terms.id
  http_method = aws_api_gateway_method.terms_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "terms_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.terms.id
  http_method = aws_api_gateway_method.terms_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "terms_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.terms.id
  http_method = aws_api_gateway_method.terms_options.http_method
  status_code = aws_api_gateway_method_response.terms_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Terms Quiz GET
resource "aws_api_gateway_method" "terms_quiz_get" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.terms_quiz.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "terms_quiz_get" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.terms_quiz.id
  http_method = aws_api_gateway_method.terms_quiz_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_terms_quiz.invoke_arn
}

resource "aws_api_gateway_method" "terms_quiz_options" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.terms_quiz.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "terms_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.terms_quiz.id
  http_method = aws_api_gateway_method.terms_quiz_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "terms_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.terms_quiz.id
  http_method = aws_api_gateway_method.terms_quiz_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "terms_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.terms_quiz.id
  http_method = aws_api_gateway_method.terms_quiz_options.http_method
  status_code = aws_api_gateway_method_response.terms_quiz_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Translate Word Endpoint
resource "aws_api_gateway_method" "translate_word_get" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.translate_word.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "translate_word_get" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.translate_word.id
  http_method = aws_api_gateway_method.translate_word_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.translate_word.invoke_arn
}

resource "aws_api_gateway_method" "translate_word_options" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.translate_word.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "translate_word_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.translate_word.id
  http_method = aws_api_gateway_method.translate_word_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "translate_word_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
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
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
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
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.translate_batch.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "translate_batch_post" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.translate_batch.id
  http_method = aws_api_gateway_method.translate_batch_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.batch_translate.invoke_arn
}

resource "aws_api_gateway_method" "translate_batch_options" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.translate_batch.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "translate_batch_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.translate_batch.id
  http_method = aws_api_gateway_method.translate_batch_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "translate_batch_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
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
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
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
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_grammar.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_grammar_post" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_grammar.id
  http_method = aws_api_gateway_method.admin_grammar_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_lesson.invoke_arn
}

resource "aws_api_gateway_method" "admin_grammar_options" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_grammar.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_grammar_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_grammar.id
  http_method = aws_api_gateway_method.admin_grammar_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_grammar_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
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
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_grammar.id
  http_method = aws_api_gateway_method.admin_grammar_options.http_method
  status_code = aws_api_gateway_method_response.admin_grammar_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Admin API Endpoints - Create Term
resource "aws_api_gateway_method" "admin_terms_post" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_terms.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_terms_post" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_terms.id
  http_method = aws_api_gateway_method.admin_terms_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_term.invoke_arn
}

resource "aws_api_gateway_method" "admin_terms_options" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_terms.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_terms_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_terms.id
  http_method = aws_api_gateway_method.admin_terms_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_terms_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_terms.id
  http_method = aws_api_gateway_method.admin_terms_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "admin_terms_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_terms.id
  http_method = aws_api_gateway_method.admin_terms_options.http_method
  status_code = aws_api_gateway_method_response.admin_terms_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Admin API Endpoints - Bulk Upload
resource "aws_api_gateway_method" "admin_bulk_post" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_bulk.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_bulk_post" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_bulk.id
  http_method = aws_api_gateway_method.admin_bulk_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.bulk_upload.invoke_arn
}

resource "aws_api_gateway_method" "admin_bulk_options" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_bulk.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_bulk_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_bulk.id
  http_method = aws_api_gateway_method.admin_bulk_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_bulk_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
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
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
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
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_grammar_quiz.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_grammar_quiz_post" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_grammar_quiz.id
  http_method = aws_api_gateway_method.admin_grammar_quiz_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_lesson_quiz.invoke_arn
}

resource "aws_api_gateway_method" "admin_grammar_quiz_options" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_grammar_quiz.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_grammar_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_grammar_quiz.id
  http_method = aws_api_gateway_method.admin_grammar_quiz_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_grammar_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
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
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_grammar_quiz.id
  http_method = aws_api_gateway_method.admin_grammar_quiz_options.http_method
  status_code = aws_api_gateway_method_response.admin_grammar_quiz_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Admin API Endpoints - Create Terms Quiz
resource "aws_api_gateway_method" "admin_terms_quiz_post" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_terms_quiz.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_terms_quiz_post" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_terms_quiz.id
  http_method = aws_api_gateway_method.admin_terms_quiz_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_terms_quiz.invoke_arn
}

resource "aws_api_gateway_method" "admin_terms_quiz_options" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_terms_quiz.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_terms_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_terms_quiz.id
  http_method = aws_api_gateway_method.admin_terms_quiz_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_terms_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_terms_quiz.id
  http_method = aws_api_gateway_method.admin_terms_quiz_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "admin_terms_quiz_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_terms_quiz.id
  http_method = aws_api_gateway_method.admin_terms_quiz_options.http_method
  status_code = aws_api_gateway_method_response.admin_terms_quiz_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Admin API Endpoints - Cleanup Duplicates
resource "aws_api_gateway_method" "admin_cleanup_post" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_cleanup.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_cleanup_post" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_cleanup.id
  http_method = aws_api_gateway_method.admin_cleanup_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.cleanup_duplicates.invoke_arn
}

resource "aws_api_gateway_method" "admin_cleanup_options" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_cleanup.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_cleanup_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_cleanup.id
  http_method = aws_api_gateway_method.admin_cleanup_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_cleanup_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
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
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_cleanup.id
  http_method = aws_api_gateway_method.admin_cleanup_options.http_method
  status_code = aws_api_gateway_method_response.admin_cleanup_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Levels API Gateway Methods
resource "aws_api_gateway_method" "admin_levels_options" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_levels.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_levels_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_levels.id
  http_method = aws_api_gateway_method.admin_levels_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_levels_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_levels.id
  http_method = aws_api_gateway_method.admin_levels_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "admin_levels_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_levels.id
  http_method = aws_api_gateway_method.admin_levels_options.http_method
  status_code = aws_api_gateway_method_response.admin_levels_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method" "admin_levels_get" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_levels.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_levels_get" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_levels.id
  http_method = aws_api_gateway_method.admin_levels_get.http_method
  type        = "AWS_PROXY"
  integration_http_method = "POST"
  uri         = aws_lambda_function.manage_levels.invoke_arn
}

resource "aws_api_gateway_method" "admin_levels_post" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_levels.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_levels_post" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_levels.id
  http_method = aws_api_gateway_method.admin_levels_post.http_method
  type        = "AWS_PROXY"
  integration_http_method = "POST"
  uri         = aws_lambda_function.manage_levels.invoke_arn
}

# Level (single) API Gateway Methods
resource "aws_api_gateway_method" "admin_level_options" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_level.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_level_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_level.id
  http_method = aws_api_gateway_method.admin_level_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_level_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_level.id
  http_method = aws_api_gateway_method.admin_level_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "admin_level_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_level.id
  http_method = aws_api_gateway_method.admin_level_options.http_method
  status_code = aws_api_gateway_method_response.admin_level_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method" "admin_level_put" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_level.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_level_put" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_level.id
  http_method = aws_api_gateway_method.admin_level_put.http_method
  type        = "AWS_PROXY"
  integration_http_method = "POST"
  uri         = aws_lambda_function.manage_levels.invoke_arn
}

resource "aws_api_gateway_method" "admin_level_delete" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_level.id
  http_method   = "DELETE"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_level_delete" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_level.id
  http_method = aws_api_gateway_method.admin_level_delete.http_method
  type        = "AWS_PROXY"
  integration_http_method = "POST"
  uri         = aws_lambda_function.manage_levels.invoke_arn
}

# Categories API Gateway Methods
resource "aws_api_gateway_method" "admin_categories_options" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_categories.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_categories_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_categories.id
  http_method = aws_api_gateway_method.admin_categories_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_categories_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_categories.id
  http_method = aws_api_gateway_method.admin_categories_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "admin_categories_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_categories.id
  http_method = aws_api_gateway_method.admin_categories_options.http_method
  status_code = aws_api_gateway_method_response.admin_categories_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method" "admin_categories_get" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_categories.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_categories_get" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_categories.id
  http_method = aws_api_gateway_method.admin_categories_get.http_method
  type        = "AWS_PROXY"
  integration_http_method = "POST"
  uri         = aws_lambda_function.manage_categories.invoke_arn
}

resource "aws_api_gateway_method" "admin_categories_post" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_categories.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_categories_post" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_categories.id
  http_method = aws_api_gateway_method.admin_categories_post.http_method
  type        = "AWS_PROXY"
  integration_http_method = "POST"
  uri         = aws_lambda_function.manage_categories.invoke_arn
}

# Category (single) API Gateway Methods
resource "aws_api_gateway_method" "admin_category_options" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_category.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_category_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_category.id
  http_method = aws_api_gateway_method.admin_category_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_category_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_category.id
  http_method = aws_api_gateway_method.admin_category_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "admin_category_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_category.id
  http_method = aws_api_gateway_method.admin_category_options.http_method
  status_code = aws_api_gateway_method_response.admin_category_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method" "admin_category_put" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_category.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_category_put" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_category.id
  http_method = aws_api_gateway_method.admin_category_put.http_method
  type        = "AWS_PROXY"
  integration_http_method = "POST"
  uri         = aws_lambda_function.manage_categories.invoke_arn
}

resource "aws_api_gateway_method" "admin_category_delete" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_category.id
  http_method   = "DELETE"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_category_delete" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_category.id
  http_method = aws_api_gateway_method.admin_category_delete.http_method
  type        = "AWS_PROXY"
  integration_http_method = "POST"
  uri         = aws_lambda_function.manage_categories.invoke_arn
}

# Upload Image API Gateway Methods
resource "aws_api_gateway_method" "admin_upload_image_options" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_upload_image.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_upload_image_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_upload_image.id
  http_method = aws_api_gateway_method.admin_upload_image_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_upload_image_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_upload_image.id
  http_method = aws_api_gateway_method.admin_upload_image_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "admin_upload_image_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_upload_image.id
  http_method = aws_api_gateway_method.admin_upload_image_options.http_method
  status_code = aws_api_gateway_method_response.admin_upload_image_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method" "admin_upload_image_post" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.admin_upload_image.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_upload_image_post" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.admin_upload_image.id
  http_method = aws_api_gateway_method.admin_upload_image_post.http_method
  type        = "AWS_PROXY"
  integration_http_method = "POST"
  uri         = aws_lambda_function.upload_image.invoke_arn
}

# App Config API Gateway Methods
resource "aws_api_gateway_method" "app_config_options" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.app_config.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "app_config_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.app_config.id
  http_method = aws_api_gateway_method.app_config_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "app_config_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.app_config.id
  http_method = aws_api_gateway_method.app_config_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "app_config_options" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.app_config.id
  http_method = aws_api_gateway_method.app_config_options.http_method
  status_code = aws_api_gateway_method_response.app_config_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method" "app_config_get" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.app_config.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "app_config_get" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.app_config.id
  http_method = aws_api_gateway_method.app_config_get.http_method
  type        = "AWS_PROXY"
  integration_http_method = "POST"
  uri         = aws_lambda_function.get_app_config.invoke_arn
}

resource "aws_api_gateway_method" "app_config_post" {
  rest_api_id   = aws_api_gateway_rest_api.cteach_api.id
  resource_id   = aws_api_gateway_resource.app_config.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "app_config_post" {
  rest_api_id = aws_api_gateway_rest_api.cteach_api.id
  resource_id = aws_api_gateway_resource.app_config.id
  http_method = aws_api_gateway_method.app_config_post.http_method
  type        = "AWS_PROXY"
  integration_http_method = "POST"
  uri         = aws_lambda_function.get_app_config.invoke_arn
}

