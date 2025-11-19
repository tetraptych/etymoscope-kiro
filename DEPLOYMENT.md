# Deployment Guide - Using Existing AWS Resources

## Existing Resources
- **S3 Bucket**: `etymoscope.com` (replace with your bucket name)
- **CloudFront Distribution**: `YOUR_DISTRIBUTION_ID`
- **CloudFront URL**: `YOUR_CLOUDFRONT_URL.cloudfront.net`

## What We'll Create
- Lambda functions (GetWord, GetRandom)
- API Gateway REST API
- IAM roles for Lambda execution

## Prerequisites

1. **AWS CLI configured** with profile:
   ```bash
   aws configure --profile personal
   ```

2. **AWS SAM CLI installed**:
   ```bash
   brew install aws-sam-cli
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

## Deployment Steps

### Step 1: Upload New Data to S3

Upload the new `full-data.json` to your existing bucket:

```bash
aws s3 cp data/full-data.json s3://etymoscope.com/data/full-data.json --profile personal
```

Verify it's there:
```bash
aws s3 ls s3://etymoscope.com/data/ --profile personal
```

### Step 2: Build and Deploy Lambda Functions

Build the Lambda functions:
```bash
sam build --profile personal
```

Deploy (first time - guided):
```bash
sam deploy --guided --profile personal
```

You'll be prompted for:
- **Stack Name**: `etymoscope-backend`
- **AWS Region**: `us-west-1` (or your preferred region)
- **Parameter DataBucket**: `etymoscope.com` (default)
- **Parameter DataKey**: `data/full-data.json` (default)
- **Confirm changes**: Y
- **Allow SAM CLI IAM role creation**: Y
- **Disable rollback**: N
- **Save arguments to config**: Y

For subsequent deploys:
```bash
sam build --profile personal
sam deploy --profile personal
```

### Step 3: Get API Endpoint

After deployment, note the API endpoint from outputs:
```bash
sam list stack-outputs --stack-name etymoscope-backend --profile personal
```

Example output:
```
ApiEndpoint: https://abc123.execute-api.us-west-1.amazonaws.com/Prod/
```

### Step 4: Update Frontend Configuration

Create production environment file:
```bash
# client/.env.production
VITE_API_URL=https://abc123.execute-api.us-west-1.amazonaws.com/Prod
```

### Step 5: Build and Deploy Frontend

Build the frontend:
```bash
npm run build
```

Deploy to S3 (this will replace the old site):
```bash
aws s3 sync dist/client/ s3://etymoscope.com/ \
  --profile personal \
  --region us-west-2 \
  --delete \
  --exclude "data/*" \
  --exclude "backup/*"
```

Note: `--exclude` preserves the data and backup folders.

### Step 6: Invalidate CloudFront Cache

Clear the CloudFront cache to serve new content:
```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*" \
  --profile personal
```

## Testing

Test the API directly:
```bash
# Get word (replace with your API endpoint)
curl "https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/Prod/api/words/language?depth=2"

# Get random
curl "https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/Prod/api/random"
```

Test the frontend:
- Visit: `https://etymoscope.com` or your CloudFront URL

## Rollback

If something goes wrong:

**Rollback Lambda**:
```bash
aws cloudformation delete-stack --stack-name etymoscope-backend --profile personal
```

**Rollback Frontend**:
```bash
# Restore old files from backup or git
aws s3 sync old-backup/ s3://etymoscope.com/ --profile personal
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*" --profile personal
```

## Cost Estimate

With existing S3 and CloudFront:
- **Lambda**: ~$0.20 per 1M requests (free tier: 1M requests/month)
- **API Gateway**: ~$1 per 1M requests (free tier: 1M requests/month)
- **S3**: Minimal additional cost (data already there)
- **CloudFront**: No additional cost (same distribution)

**Expected**: $0-5/month after free tier

## Monitoring

View Lambda logs:
```bash
sam logs --stack-name etymoscope-backend --profile personal --tail
```

View specific function logs:
```bash
aws logs tail /aws/lambda/etymoscope-backend-GetWordFunction --follow --profile personal
```

## Updating

**Update Lambda code**:
```bash
sam build --profile personal
sam deploy --profile personal
```

**Update data**:
```bash
aws s3 cp data/full-data.json s3://etymoscope.com/data/full-data.json --profile personal
# Lambda will pick up new data on next cold start
```

**Update frontend**:
```bash
npm run build
aws s3 sync dist/client/ s3://etymoscope.com/ --profile personal --delete --exclude "data/*" --exclude "backup/*"
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*" --profile personal
```