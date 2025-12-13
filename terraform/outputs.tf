output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.tilgo_distribution.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.tilgo_distribution.domain_name
}

output "s3_bucket_name" {
  description = "S3 bucket name"
  value       = aws_s3_bucket.tilgo_website.id
}

output "api_gateway_url" {
  description = "API Gateway endpoint URL"
  value       = aws_api_gateway_stage.tilgo_api.invoke_url
}

output "api_gateway_id" {
  description = "API Gateway ID"
  value       = aws_api_gateway_rest_api.tilgo_api.id
}

output "dynamodb_tables" {
  description = "DynamoDB table names"
  value = {
    grammar_lessons   = aws_dynamodb_table.grammar_lessons.name
    grammar_quizzes    = aws_dynamodb_table.grammar_quizzes.name
    vocabulary_words   = aws_dynamodb_table.vocabulary_words.name
    word_translations  = aws_dynamodb_table.word_translations.name
  }
}

output "certificate_arn" {
  description = "ACM Certificate ARN"
  value       = aws_acm_certificate_validation.tilgo_cert.certificate_arn
}

output "route53_record" {
  description = "Route53 record name"
  value       = aws_route53_record.tilgo.fqdn
}

