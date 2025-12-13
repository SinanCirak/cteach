# 🚀 Tilgo Deployment Guide

## Pre-Deployment Checklist

- [x] Lambda dependencies installed
- [ ] AWS CLI configured
- [ ] Terraform installed
- [ ] Route53 domain configured
- [ ] terraform.tfvars created

## Deployment Steps

### 1. Initialize Terraform
```bash
cd terraform
terraform init
```

### 2. Review Plan
```bash
terraform plan
```

### 3. Apply Infrastructure
```bash
terraform apply
```

**Note:** This will take 15-20 minutes:
- ACM certificate validation: 5-10 minutes
- CloudFront distribution: 15-20 minutes

### 4. Get API Gateway URL
```bash
terraform output api_gateway_url
```

### 5. Create .env File
```bash
# Get API URL from terraform output
echo "VITE_API_URL=<api-url-from-output>" > .env
```

### 6. Build Frontend
```bash
npm run build
```

### 7. Deploy to S3
```bash
# Get bucket name from terraform output
terraform output s3_bucket_name

# Sync files
aws s3 sync dist/ s3://<bucket-name> --delete
```

### 8. Invalidate CloudFront Cache
```bash
# Get distribution ID from terraform output
terraform output cloudfront_distribution_id

# Invalidate cache
aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"
```

## Post-Deployment

### Verify Deployment
1. Visit `https://tilgo.cirak.ca`
2. Check API endpoints are working
3. Test translation features

### Seed Data (Optional)
After deployment, you can seed DynamoDB with initial data:
```bash
# Create seed scripts and run them
node scripts/seed-grammar-lessons.js
node scripts/seed-vocabulary-words.js
```

## Troubleshooting

### Certificate Validation Failed
- Check Route53 DNS records
- Wait 5-10 minutes for propagation
- Re-run `terraform apply`

### CloudFront Not Updating
- Invalidate cache: `aws cloudfront create-invalidation --distribution-id <id> --paths "/*"`
- Wait 5-10 minutes for propagation

### Lambda Function Errors
- Check CloudWatch logs
- Verify DynamoDB table names in environment variables
- Check IAM permissions


