# AWS Serverless Deployment - Requirements

## Overview
Convert the current Express-based backend to AWS serverless architecture using Lambda functions, API Gateway, S3, and CloudFront.

## User Stories

### US-1: Lambda Function API
**As a** developer  
**I want** the API endpoints to work as AWS Lambda functions  
**So that** the app scales automatically without managing servers

**Acceptance Criteria:**
- API routes work as Lambda functions behind API Gateway
- Data loading happens efficiently (S3 or bundled)
- Cold start times are acceptable (<3 seconds)
- All existing API functionality is preserved
- Warm starts are fast (<500ms)

### US-2: S3 + CloudFront Frontend
**As a** user  
**I want** the frontend served via CloudFront CDN  
**So that** page loads are fast globally with low latency

**Acceptance Criteria:**
- Frontend hosted on S3 as static website
- CloudFront distribution serves content globally
- HTTPS enabled with SSL certificate
- Client-side routing works correctly
- Cache invalidation works for updates

### US-3: S3 Data Storage
**As a** developer  
**I want** the etymology data stored in S3  
**So that** Lambda functions can access it efficiently

**Acceptance Criteria:**
- `full-data.json` uploaded to S3 bucket
- Lambda functions can read from S3
- Data is cached in Lambda memory between invocations
- Data can be updated by uploading new file to S3
- Proper IAM permissions configured

### US-4: Infrastructure as Code
**As a** developer  
**I want** infrastructure defined as code  
**So that** deployment is repeatable and version-controlled

**Acceptance Criteria:**
- AWS SAM or CDK template defines all resources
- Single command deploys entire stack
- Environment variables configured via template
- Stack can be torn down and recreated easily
- Outputs include API endpoint and CloudFront URL

## Technical Requirements

### Architecture
- Lambda functions with Node.js 20.x runtime
- API Gateway REST API for routing
- S3 for static website hosting and data storage
- CloudFront for CDN and HTTPS
- IAM roles with least-privilege permissions

### Performance
- Cold start time: <3 seconds
- Warm start time: <500ms
- API response time: <1 second (including S3 read)
- Frontend initial load: <2 seconds via CloudFront
- Lambda memory: 512MB-1024MB

### AWS Services
- **Lambda**: Serverless compute for API
- **API Gateway**: HTTP API endpoint
- **S3**: Static hosting + data storage
- **CloudFront**: CDN distribution
- **IAM**: Access control
- **ACM**: SSL certificates (optional)
- **Route 53**: DNS (optional)

### Cost Estimates
- **Free tier eligible** for first year
- **Ongoing costs** (after free tier):
  - S3: ~$0.20/month
  - Lambda: ~$0.20 per 1M requests
  - API Gateway: ~$1 per 1M requests
  - CloudFront: ~$0.085/GB transfer
- **Expected total**: $0-10/month for hobby project

## Out of Scope
- Database integration (using S3 for data)
- Authentication/authorization
- Custom rate limiting (use API Gateway throttling)
- WebSocket support
- Real-time features
- Multi-region deployment (single region initially)

## Dependencies
- **AWS CLI** - For deployment and management
- **AWS SAM CLI** - For local testing and deployment
- **Node.js 20.x** - Lambda runtime
- **Existing dependencies** - No new runtime deps needed
- **Build tools** - Vite, esbuild (already in place)

## Success Metrics
- Successful deployment to AWS
- All API endpoints functional via API Gateway
- Frontend loads from CloudFront
- Cold start <3s, warm start <500ms
- Monthly costs <$10
- 99.9% uptime (AWS SLA)
- Can deploy updates in <5 minutes
