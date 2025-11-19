# AWS Serverless Deployment - Tasks

## Prerequisites

- [ ] AWS account created
- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] AWS SAM CLI installed
- [ ] Node.js 20.x installed
- [ ] Decide on AWS region (e.g., us-east-1)

## Phase 1: Project Setup

### Task 1.1: Install AWS Tools
- [ ] Install AWS CLI: `brew install awscli` (macOS)
- [ ] Install SAM CLI: `brew install aws-sam-cli`
- [ ] Configure AWS credentials: `aws configure`
- [ ] Test connection: `aws sts get-caller-identity`

### Task 1.2: Create SAM Template
- [ ] Create `template.yaml` in project root
- [ ] Define Lambda functions (GetWord, GetRandom)
- [ ] Define API Gateway REST API
- [ ] Define S3 buckets (frontend, data)
- [ ] Define IAM roles and policies
- [ ] Define CloudFront distribution
- [ ] Add outputs (API URL, CloudFront URL)

### Task 1.3: Create Project Structure
- [ ] Create `lambda/` directory
- [ ] Create `lambda/getWord/` subdirectory
- [ ] Create `lambda/getRandom/` subdirectory
- [ ] Create `lambda/shared/` for common code
- [ ] Update `.gitignore` for `.aws-sam/` build directory

## Phase 2: Lambda Functions

### Task 2.1: Create Shared Storage Module
- [ ] Create `lambda/shared/storage.ts`
- [ ] Implement S3 data loading with AWS SDK v3
- [ ] Add memory caching (global variable)
- [ ] Add error handling for S3 failures
- [ ] Export `loadData()` and `getWordGraph()` functions
- [ ] Create `lambda/shared/package.json`
- [ ] Add dependencies: `@aws-sdk/client-s3`

### Task 2.2: Implement GetWord Lambda
- [ ] Create `lambda/getWord/index.ts`
- [ ] Implement Lambda handler function
- [ ] Parse path parameters (`word`) and query params (`depth`)
- [ ] Call shared storage module
- [ ] Return proper API Gateway response format
- [ ] Add error handling (404, 500)
- [ ] Create `lambda/getWord/package.json`
- [ ] Add TypeScript types from `shared/schema.ts`

### Task 2.3: Implement GetRandom Lambda
- [ ] Create `lambda/getRandom/index.ts`
- [ ] Implement Lambda handler function
- [ ] Load all words from storage
- [ ] Filter by node count (<850)
- [ ] Return random word
- [ ] Add error handling
- [ ] Create `lambda/getRandom/package.json`

### Task 2.4: Build Lambda Packages
- [ ] Add build script to package.json
- [ ] Configure TypeScript for Lambda (target: ES2020)
- [ ] Test local build: `sam build`
- [ ] Verify output in `.aws-sam/build/`

## Phase 3: Local Testing

### Task 3.1: Setup Local Testing
- [ ] Create `samconfig.toml` for configuration
- [ ] Create local test events in `events/` directory
- [ ] Add sample `get-word-event.json`
- [ ] Add sample `get-random-event.json`

### Task 3.2: Test Lambda Functions Locally
- [ ] Start local API: `sam local start-api`
- [ ] Test GetWord endpoint: `curl http://localhost:3000/api/words/etymology?depth=2`
- [ ] Test GetRandom endpoint: `curl http://localhost:3000/api/random`
- [ ] Verify responses match current API
- [ ] Test error cases (invalid word, missing params)

### Task 3.3: Test with Local Data
- [ ] Create local S3 mock or use local file
- [ ] Update Lambda to support local development
- [ ] Test cold start behavior
- [ ] Measure response times

## Phase 4: Frontend Updates

### Task 4.1: Update API Configuration
- [ ] Create `client/src/config.ts` for API URL
- [ ] Use environment variable for API Gateway URL
- [ ] Update API calls to use config
- [ ] Ensure CORS headers are handled

### Task 4.2: Build Frontend for S3
- [ ] Run `npm run build` in client directory
- [ ] Verify output in `client/dist/`
- [ ] Test built files locally
- [ ] Ensure routing works with S3 (index.html fallback)

### Task 4.3: Create S3 Upload Script
- [ ] Create `scripts/deploy-frontend.sh`
- [ ] Script uploads `client/dist/` to S3
- [ ] Script invalidates CloudFront cache
- [ ] Make script executable

## Phase 5: AWS Deployment

### Task 5.1: Deploy Data to S3
- [ ] Create S3 bucket for data (via SAM or manually)
- [ ] Upload `data/full-data.json` to S3
- [ ] Verify file is accessible by Lambda
- [ ] Set bucket policy for Lambda access

### Task 5.2: Deploy Lambda Stack
- [ ] Run `sam build`
- [ ] Run `sam deploy --guided` (first time)
- [ ] Choose stack name (e.g., `etymoscope-api`)
- [ ] Confirm IAM role creation
- [ ] Save configuration to `samconfig.toml`
- [ ] Note API Gateway URL from outputs

### Task 5.3: Deploy Frontend to S3
- [ ] Create S3 bucket for frontend (via SAM or manually)
- [ ] Enable static website hosting
- [ ] Set bucket policy for public read
- [ ] Upload built frontend files
- [ ] Test S3 website URL

### Task 5.4: Setup CloudFront
- [ ] Create CloudFront distribution (via SAM or console)
- [ ] Set S3 bucket as origin
- [ ] Configure default root object (index.html)
- [ ] Configure error pages (404 → index.html for SPA)
- [ ] Enable compression
- [ ] Wait for distribution to deploy (~15 minutes)
- [ ] Test CloudFront URL

## Phase 6: Integration Testing

### Task 6.1: Test Full Stack
- [ ] Visit CloudFront URL
- [ ] Test word search functionality
- [ ] Test random word button
- [ ] Test depth controls
- [ ] Test visualization rendering
- [ ] Test on mobile device
- [ ] Test on different browsers

### Task 6.2: Performance Testing
- [ ] Measure cold start time
- [ ] Measure warm start time
- [ ] Test concurrent requests
- [ ] Monitor Lambda logs in CloudWatch
- [ ] Check API Gateway metrics
- [ ] Verify CloudFront caching

### Task 6.3: Error Handling
- [ ] Test invalid word
- [ ] Test invalid depth parameter
- [ ] Test network errors
- [ ] Verify error messages are user-friendly
- [ ] Check CloudWatch logs for errors

## Phase 7: Optimization

### Task 7.1: Lambda Optimization
- [ ] Adjust memory allocation (test 512MB, 1024MB)
- [ ] Set appropriate timeout values
- [ ] Enable Lambda function URLs (alternative to API Gateway)
- [ ] Consider provisioned concurrency for zero cold starts (costs more)

### Task 7.2: Cost Optimization
- [ ] Review AWS Cost Explorer
- [ ] Set up billing alerts
- [ ] Optimize Lambda memory/timeout
- [ ] Consider S3 lifecycle policies
- [ ] Review CloudFront pricing

### Task 7.3: Monitoring Setup
- [ ] Create CloudWatch dashboard
- [ ] Set up alarms for errors
- [ ] Set up alarms for high latency
- [ ] Configure SNS for notifications
- [ ] Set up X-Ray tracing (optional)

## Phase 8: Custom Domain (Optional)

### Task 8.1: Setup Domain
- [ ] Register domain or use existing
- [ ] Create hosted zone in Route 53
- [ ] Request SSL certificate in ACM (us-east-1 for CloudFront)
- [ ] Validate certificate

### Task 8.2: Configure CloudFront
- [ ] Add custom domain to CloudFront distribution
- [ ] Associate ACM certificate
- [ ] Create Route 53 alias record
- [ ] Test custom domain

### Task 8.3: Configure API Gateway
- [ ] Create custom domain for API
- [ ] Map to API Gateway stage
- [ ] Update frontend API configuration
- [ ] Test API via custom domain

## Phase 9: Documentation

### Task 9.1: Update README
- [ ] Add AWS deployment section
- [ ] Document prerequisites
- [ ] Document deployment commands
- [ ] Add architecture diagram
- [ ] Include cost estimates

### Task 9.2: Create Deployment Guide
- [ ] Step-by-step deployment instructions
- [ ] Troubleshooting section
- [ ] How to update data file
- [ ] How to update code
- [ ] How to rollback

### Task 9.3: Create Operations Guide
- [ ] How to monitor the application
- [ ] How to view logs
- [ ] How to handle errors
- [ ] Cost management tips
- [ ] Backup and recovery procedures

## Phase 10: Cleanup & Maintenance

### Task 10.1: Cleanup Development Resources
- [ ] Remove test stacks
- [ ] Delete unused S3 objects
- [ ] Remove old Lambda versions
- [ ] Clean up CloudWatch logs (set retention)

### Task 10.2: Setup CI/CD (Optional)
- [ ] Create GitHub Actions workflow
- [ ] Automate SAM build and deploy
- [ ] Automate frontend build and S3 upload
- [ ] Automate CloudFront invalidation
- [ ] Add deployment approval step

### Task 10.3: Regular Maintenance
- [ ] Schedule monthly cost review
- [ ] Update Lambda runtime when needed
- [ ] Update dependencies
- [ ] Review and optimize based on metrics
- [ ] Update data file as needed
