# Deployment Guide

This guide will help you deploy Magic Brush to Cloudflare.

## Prerequisites

1. **Cloudflare Account**: Sign up at https://dash.cloudflare.com/sign-up
2. **Node.js 18+**: Install from https://nodejs.org/
3. **Wrangler CLI**: Will be installed with dependencies

## Step 1: Install Dependencies

```bash
# Install frontend dependencies
cd frontend
npm install

# Install workers dependencies
cd ../workers
npm install
```

## Step 2: Configure Cloudflare

### 2.1 Login to Cloudflare

```bash
cd workers
npx wrangler login
```

This will open a browser window for you to authenticate.

### 2.2 Create R2 Bucket

```bash
npx wrangler r2 bucket create magic-brush-html-files
```

This creates the R2 bucket to store generated HTML files.

### 2.3 Update Workers Configuration

Edit `workers/wrangler.toml` if needed:

```toml
name = "magic-brush-api"
main = "src/index.ts"
compatibility_date = "2023-12-18"

[[r2_buckets]]
binding = "HTML_BUCKET"
bucket_name = "magic-brush-html-files"  # Must match the bucket you created
```

## Step 3: Deploy Workers

```bash
cd workers
npm run deploy
```

After deployment, you'll see an output like:

```
Published magic-brush-api (X.XX sec)
  https://magic-brush-api.<your-subdomain>.workers.dev
```

**Important**: Copy this URL - you'll need it for the frontend configuration.

## Step 4: Configure Frontend

Edit `frontend/src/utils/api.ts` and update the API base URL:

```typescript
const API_BASE_URL = import.meta.env.PROD
  ? 'https://magic-brush-api.<your-subdomain>.workers.dev'  // Replace with your Workers URL
  : 'http://localhost:8787';
```

## Step 5: Deploy Frontend to Cloudflare Pages

### Option A: Deploy via CLI

```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=magic-brush
```

### Option B: Deploy via Dashboard (Recommended for CI/CD)

1. Go to https://dash.cloudflare.com
2. Navigate to **Pages**
3. Click **Create a project**
4. Connect your Git repository (GitHub, GitLab, etc.)
5. Configure build settings:
   - **Build command**: `cd frontend && npm install && npm run build`
   - **Build output directory**: `frontend/dist`
6. Click **Save and Deploy**

## Step 6: Access Your Application

After deployment, your app will be available at:
```
https://magic-brush.pages.dev
```

Or a custom domain if you configured one.

## Environment-Specific Configuration

### Development

```bash
# Terminal 1: Run Workers locally
cd workers
npm run dev

# Terminal 2: Run Frontend locally
cd frontend
npm run dev
```

Access at: http://localhost:5173

### Production

- Frontend: Deployed on Cloudflare Pages
- Workers: Deployed on Cloudflare Workers
- Storage: Cloudflare R2

## Custom Domain (Optional)

### For Cloudflare Pages:

1. Go to your Pages project
2. Click **Custom domains**
3. Add your domain
4. Update DNS records as instructed

### For Cloudflare Workers:

Add routes in `wrangler.toml`:

```toml
routes = [
  { pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

## Troubleshooting

### CORS Issues

If you encounter CORS errors, ensure the Workers API has CORS enabled:

```typescript
// workers/src/index.ts
app.use('/*', cors());
```

### R2 Bucket Not Found

Verify the bucket name in `wrangler.toml` matches the created bucket:

```bash
npx wrangler r2 bucket list
```

### API Key Issues

Make sure users are entering valid API keys:
- OpenAI: Starts with `sk-...`
- Claude: Starts with `sk-ant-...`

### Build Errors

Clear dependencies and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

## Cost Estimation

### Cloudflare Free Tier Includes:

- **Workers**: 100,000 requests/day
- **Pages**: Unlimited requests
- **R2**: 10 GB storage, 1M Class A operations/month

For most personal projects, this stays within the free tier.

## Security Notes

1. **API Keys**: Never stored on servers - only in browser sessionStorage
2. **HTTPS**: Automatically enabled on Cloudflare
3. **R2 Access**: Only via Workers (not public)

## Updating the Application

### Update Workers:

```bash
cd workers
npm run deploy
```

### Update Frontend:

```bash
cd frontend
npm run build
npx wrangler pages deploy dist
```

Or push to Git if using CI/CD.

## Monitoring

View logs and analytics:

1. **Workers Logs**: `npx wrangler tail`
2. **Pages Analytics**: Cloudflare Dashboard → Pages → Analytics
3. **R2 Usage**: Cloudflare Dashboard → R2 → Metrics

## Support

For issues:
- Check the main README.md
- Review Cloudflare documentation
- Check application logs
