# Batch Translate API Gateway Setup

After running `terraform apply`, you need to manually configure the batch translate endpoint in API Gateway, or add these resources to main.tf:

## Required API Gateway Resources

1. **Method**: POST /translate/batch
2. **Integration**: Lambda function (batch-translate)
3. **CORS**: OPTIONS method for /translate/batch

## Manual Setup Steps

1. Go to API Gateway console
2. Navigate to `/translate/batch` resource
3. Create POST method
4. Set integration type to Lambda Function
5. Select `batch-translate` function
6. Enable CORS
7. Deploy API

## Or Add to Terraform

See the Lambda deployment section in main.tf (to be added).



