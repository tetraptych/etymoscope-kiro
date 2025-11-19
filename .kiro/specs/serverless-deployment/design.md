# AWS Serverless Deployment - Design

## Architecture Overview

### Current Structure
```
├── server/
│   ├── index.ts (Express app)
│   ├── routes.ts (API routes)
│   └── storage.ts (In-memory data)
├── client/ (Vite React app)
└── data/full-data.json
```

### Target AWS Architecture
```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌──────────────┐
│ CloudFront  │   │ API Gateway  │
│    (CDN)    │   │   (REST)     │
└──────┬──────┘   └──────┬───────┘
       │                 │
       ▼                 ▼
┌─────────────┐   ┌──────────────┐
│  S3 Bucket  │   │   Lambda     │
│  (Frontend) │   │  Functions   │
└─────────────┘   └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  S3 Bucket   │
                  │    (Data)    │
                  └──────────────┘
```

### File Structure
```
├── lambda/
│   ├── getWord/
│   │   ├── index.ts (Lambda handler)
│   │   └── package.json
│   ├── getRandom/
│   │   ├── index.ts (Lambda handler)
│   │   └── package.json
│   └── shared/
│       └── storage.ts (S3 data loader)
├── client/ (Vite React app)
├── data/full-data.json
├── template.yaml (AWS SAM template)
└── samconfig.toml (SAM configuration)
```

## Component Design

### 1. Lambda Functions

**GetWord Function** (`/api/words/{word}`)
- Handler: `lambda/getWord/index.ts`
- Memory: 1024MB
- Timeout: 30 seconds
- Environment: `DATA_BUCKET`, `DATA_KEY`
- Permissions: `s3:GetObject` on data bucket

**GetRandom Function** (`/api/random`)
- Handler: `lambda/getRandom/index.ts`
- Memory: 512MB
- Timeout: 10 seconds
- Environment: `DATA_BUCKET`, `DATA_KEY`
- Permissions: `s3:GetObject` on data bucket

### 2. Shared Storage Module

**Location**: `lambda/shared/storage.ts`

**Features**:
- Loads data from S3 on first invocation
- Caches in Lambda memory (global scope)
- Reused across warm invocations
- Handles S3 errors gracefully

**Implementation**:
```typescript
let cachedData: EtymologyData | null = null;

export async function loadData(): Promise<EtymologyData> {
  if (cachedData) return cachedData;
  
  const s3 = new S3Client({});
  const response = await s3.send(new GetObjectCommand({
    Bucket: process.env.DATA_BUCKET,
    Key: process.env.DATA_KEY
  }));
  
  cachedData = JSON.parse(await response.Body.transformToString());
  return cachedData;
}
```

### 3. API Gateway Configuration

- **Type**: REST API (cheaper than HTTP API for this use case)
- **CORS**: Enabled for frontend domain
- **Throttling**: 1000 requests/second
- **Caching**: Optional (adds cost)
- **Custom domain**: Optional via Route 53

### 4. S3 Buckets

**Frontend Bucket**:
- Name: `etymoscope-frontend`
- Static website hosting enabled
- Public read access
- Bucket policy allows CloudFront

**Data Bucket**:
- Name: `etymoscope-data`
- Private (Lambda access only)
- Versioning enabled
- Lifecycle policy: Keep 3 versions

### 5. CloudFront Distribution

- Origin: S3 frontend bucket
- SSL: ACM certificate (optional)
- Caching: Aggressive for static assets
- Invalidation: On deployment
- Compression: Gzip/Brotli enabled

## Data Flow

### Frontend Request
1. User visits site → CloudFront serves cached HTML/JS from S3
2. Browser loads React app
3. User searches word → API call to API Gateway

### API Request
1. API Gateway receives request → Routes to Lambda
2. Lambda checks memory cache → If empty, loads from S3
3. Lambda processes graph traversal → Returns subgraph JSON
4. API Gateway returns response → Client renders visualization

### Cold Start Flow
1. First request → Lambda initializes (~2-3s)
2. Loads data from S3 (~500ms)
3. Processes request (~100ms)
4. Total: ~3s

### Warm Start Flow
1. Subsequent request → Lambda already initialized
2. Data in memory → No S3 call
3. Processes request (~100ms)
4. Total: ~100-200ms

## Build & Deployment Process

### Frontend Build
```bash
cd client
npm run build
# Output: dist/
```

### Lambda Build
```bash
cd lambda/getWord
npm install --production
# SAM packages automatically
```

### Deployment
```bash
sam build
sam deploy --guided
# Deploys entire stack
```

### Data Upload
```bash
aws s3 cp data/full-data.json s3://etymoscope-data/
```

## Key Decisions

### Why Lambda over EC2/ECS?
- **No server management**: AWS handles scaling, patching
- **Pay per use**: Only charged for actual requests
- **Auto-scaling**: Handles traffic spikes automatically
- **High availability**: Multi-AZ by default

### Why S3 for data instead of bundling?
- **Smaller Lambda package**: Faster cold starts
- **Easy updates**: Upload new file without redeploying code
- **Shared across functions**: Both functions access same data
- **Versioning**: Can rollback data changes

### Why REST API over HTTP API?
- **Feature parity**: Both work for this use case
- **Cost**: Similar pricing
- **Familiarity**: REST API more common

### Why CloudFront over S3 direct?
- **HTTPS**: Free SSL certificates
- **Performance**: Global edge caching
- **Custom domain**: Easy setup
- **Compression**: Automatic gzip/brotli

## Security Considerations

- **IAM roles**: Least-privilege access
- **S3 bucket policies**: Restrict access
- **API Gateway**: Throttling enabled
- **CloudFront**: Origin access identity
- **No secrets in code**: Use environment variables
- **CORS**: Restrict to frontend domain


## Development Workflow

### Hybrid Development Approach (Recommended)

The best approach is to maintain both Express (for development) and Lambda (for production) with shared business logic.

### Project Structure
```
├── server/                    # Development server (Express)
│   ├── index.ts              # Express app
│   ├── routes.ts             # Route handlers
│   └── storage.ts            # Business logic
├── lambda/                    # Production functions (Lambda)
│   ├── getWord/
│   │   ├── index.ts          # Lambda handler (thin wrapper)
│   │   └── package.json
│   ├── getRandom/
│   │   ├── index.ts          # Lambda handler (thin wrapper)
│   │   └── package.json
│   └── shared/
│       ├── storage.ts        # Shared business logic
│       └── types.ts          # Shared types
├── shared/                    # Shared across all
│   └── schema.ts             # Zod schemas
└── client/                    # Frontend
```

### Development Modes

#### Mode 1: Local Development (Daily Work)
```bash
# Terminal 1: Start Express backend
npm run dev

# Terminal 2: Start Vite frontend
cd client && npm run dev
```

**Use for:**
- Feature development
- Debugging
- Rapid iteration
- Hot reload

**Benefits:**
- Fast startup (~1 second)
- Hot reload works
- Familiar debugging
- No Docker required

#### Mode 2: Lambda Simulation (Pre-Deployment Testing)
```bash
# Build Lambda functions
sam build

# Start local Lambda API
sam local start-api --port 3001

# In another terminal, start frontend
cd client && npm run dev
```

**Use for:**
- Testing before deployment
- Validating Lambda-specific behavior
- Testing cold starts
- Catching AWS-specific issues

**Benefits:**
- Exact Lambda environment
- Tests IAM permissions
- Validates SAM template
- Catches deployment issues early

**Drawbacks:**
- Slower startup (~5-10 seconds)
- Requires Docker
- No hot reload
- More resource intensive

#### Mode 3: Production (AWS)
```bash
# Deploy to AWS
sam build && sam deploy
```

**Use for:**
- Production deployment
- Staging environment
- Performance testing
- Real-world validation

### Code Sharing Strategy

#### Shared Business Logic
Extract core logic to `lambda/shared/storage.ts`:

```typescript
// lambda/shared/storage.ts
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import type { EtymologyData, GraphNode, GraphEdge } from '@shared/schema';

let cachedData: EtymologyData | null = null;

export async function loadData(): Promise<EtymologyData> {
  // In Lambda: load from S3
  if (process.env.AWS_EXECUTION_ENV) {
    if (cachedData) return cachedData;
    
    const s3 = new S3Client({});
    const response = await s3.send(new GetObjectCommand({
      Bucket: process.env.DATA_BUCKET!,
      Key: process.env.DATA_KEY!
    }));
    
    const body = await response.Body!.transformToString();
    cachedData = JSON.parse(body);
    return cachedData;
  }
  
  // In development: load from file
  const fs = await import('fs');
  const path = await import('path');
  const dataPath = path.resolve('./data/full-data.json');
  const fileContent = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(fileContent);
}

export async function getWordGraph(
  word: string, 
  depth: number
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const data = await loadData();
  // ... graph traversal logic (same as current implementation)
}
```

#### Lambda Handler (Thin Wrapper)
```typescript
// lambda/getWord/index.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getWordGraph } from '../shared/storage';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const word = event.pathParameters?.word;
    const depth = parseInt(event.queryStringParameters?.depth || '2');
    
    if (!word) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Word parameter required' })
      };
    }
    
    const result = await getWordGraph(word, depth);
    
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

#### Express Route (Development)
```typescript
// server/routes.ts
import { getWordGraph } from '../lambda/shared/storage';

app.get('/api/words/:word', async (req, res) => {
  try {
    const { word } = req.params;
    const depth = parseInt(req.query.depth as string) || 2;
    
    const result = await getWordGraph(word, depth);
    res.json(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Environment Detection

The shared code detects the environment:

```typescript
const isLambda = !!process.env.AWS_EXECUTION_ENV;
const isDevelopment = process.env.NODE_ENV === 'development';

if (isLambda) {
  // Load from S3
} else {
  // Load from local file
}
```

### Frontend Configuration

Use environment variables for API URL:

```typescript
// client/src/config.ts
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

**Development** (`.env.development`):
```
VITE_API_URL=http://localhost:5000
```

**Production** (`.env.production`):
```
VITE_API_URL=https://api.etymoscope.com
```

### Testing Strategy

1. **Unit tests**: Test shared business logic
2. **Integration tests**: Test Express routes (development)
3. **E2E tests**: Test Lambda handlers with SAM local
4. **Smoke tests**: Test deployed Lambda in AWS

### Deployment Workflow

```bash
# 1. Develop locally with Express
npm run dev

# 2. Test with SAM local before deploying
sam build
sam local start-api
# Run integration tests

# 3. Deploy to AWS
sam deploy

# 4. Deploy frontend
npm run build:client
aws s3 sync client/dist/ s3://etymoscope-frontend/
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"
```

### Benefits of This Approach

✅ **Fast development** - No Lambda overhead during daily work
✅ **Production confidence** - Test Lambda locally before deploying
✅ **Code reuse** - Business logic shared between Express and Lambda
✅ **Minimal duplication** - Only thin wrappers differ
✅ **Easy debugging** - Use familiar Node.js debugging tools
✅ **Gradual migration** - Can deploy incrementally
✅ **Rollback safety** - Keep Express as fallback

### When to Use Each Mode

| Task | Mode | Command |
|------|------|---------|
| Feature development | Express | `npm run dev` |
| Bug fixing | Express | `npm run dev` |
| Pre-deployment check | SAM Local | `sam local start-api` |
| Testing cold starts | SAM Local | `sam local start-api` |
| Production deployment | AWS Lambda | `sam deploy` |
| Performance testing | AWS Lambda | (deployed) |
