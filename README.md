# Magic Brush - AI-Powered Product Design Tool

An AI-powered web application for sharing AI-built pages and tools through natural language descriptions.

## Features

- 🤖 AI-powered product design using OpenAI or Claude
- 🎨 Generate interactive HTML pages
- 💬 Iterative refinement through chat
- 🔒 Privacy-first: AI runs in your browser with your API key
- ☁️ Deployed on Cloudflare infrastructure

## Architecture

- **Frontend**: React + TypeScript + Vite (Cloudflare Pages)
- **Backend**: Cloudflare Workers + R2 Storage
- **AI**: OpenAI GPT-4 or Claude (user-provided API keys)

## Project Structure

```
brush/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── agents/    # AI Agent logic
│   │   └── utils/
│   └── package.json
├── workers/           # Cloudflare Workers API
│   ├── src/
│   └── wrangler.toml
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Cloudflare account (for deployment)

### Development

1. **Install dependencies**

```bash
# Frontend
cd frontend
npm install

# Workers
cd ../workers
npm install
```

2. **Run locally**

```bash
# Terminal 1: Run Workers
cd workers
npm run dev

# Terminal 2: Run Frontend
cd frontend
npm run dev
```

3. **Access the app**

Open http://localhost:5173

### Deployment

1. **Deploy Workers**

```bash
cd workers
npm run deploy
```

2. **Deploy Frontend to Cloudflare Pages**

```bash
cd frontend
npm run deploy
```

## Usage

1. **Enter your API key**: OpenAI or Claude API token
2. **Describe your product**: Write what you want to build
3. **Click "Design"**: AI generates an interactive page
4. **Iterate**: Use the chat panel to refine the design

## Environment Variables

No environment variables needed - all API keys are user-provided and stored in browser session only.

## License

MIT
