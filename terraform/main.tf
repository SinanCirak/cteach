terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
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

  # Cache behavior for API calls
  ordered_cache_behavior {
    path_pattern     = "/api/*"
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
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.tilgo_website.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.tilgo_distribution.arn
          }
        }
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
  }

  tags = {
    Name        = "Vocabulary Words"
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

