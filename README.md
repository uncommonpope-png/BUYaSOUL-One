# BUYaSOUL Workbench + Soul Engine

Build, configure, and deploy AI agents with real integrations.

## Features

- **Agent Simulator** - Chat with custom AI agents powered by Gemini, OpenAI, or Anthropic
- **Skill Library** - 105+ pre-built skills across core, integration, and utility categories
- **BrainIngestion** - Document ingestion and vector search with ChromaDB
- **Soul Marketplace** - Share and discover agent configurations
- **Multi-Provider Support** - Use any LLM provider with your own API keys
- **Real Integrations** - Shopify, HubSpot, Pinecone, Slack, Solana, and more
- **Secure Vault** - Encrypted API key storage
- **Code Export** - Generate production-ready Node.js and Python integration code

## Quick Start

### Docker (Recommended)

```bash
# Clone or extract the project
cd BUYaSOUL-One/workbench

# Create environment file
cp .env.example .env
# Edit .env with your API keys

# Start services
docker-compose up -d

# Open http://localhost:3000
```

### Manual Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev

# Open http://localhost:3000
```

## Configuration

### Required

| Variable | Description |
|----------|-------------|
| `MASTER_API_KEY` | Your workbench access key |
| `VAULT_PASSPHRASE` | Encryption passphrase for stored keys |
| `GEMINI_API_KEY` | Google Gemini API key (or use OpenAI/Anthropic) |

### Optional Integrations

| Variable | Service |
|----------|---------|
| `OPENAI_API_KEY` | OpenAI GPT models |
| `ANTHROPIC_API_KEY` | Anthropic Claude models |
| `PINECONE_API_KEY` | Pinecone vector database |
| `SLACK_WEBHOOK_URL` | Slack notifications |
| `HUBSPOT_API_KEY` | HubSpot CRM |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | Shopify store |
| `SOLANA_RPC_URL` | Solana blockchain |

## Architecture

```
workbench/
├── server.ts              # Express API server (1400+ lines)
├── src/
│   ├── components/        # React UI components
│   │   ├── AgentSimulator.tsx
│   │   ├── SkillLibrary.tsx
│   │   ├── BrainIngestion.tsx
│   │   ├── SoulMarketplace.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── chroma.ts      # ChromaDB client
│   │   ├── ingestion.ts   # Document chunking + embedding
│   │   ├── retriever.ts   # Vector search
│   │   └── keyStore.ts    # Encrypted key storage
│   └── middleware/
│       ├── auth.ts        # API key authentication
│       └── rateLimit.ts   # Rate limiting
├── docker-compose.yml     # Docker deployment
├── Dockerfile             # Production build
└── SETUP.md               # Customer setup guide
```

## API Endpoints

### Authentication
All endpoints require `X-API-Key` header.

### Agent Endpoints
- `POST /api/agent/compile` - Generate integration code
- `POST /api/agent/chat` - Chat with agent
- `POST /api/agent/generate-avatar` - Generate agent avatar
- `POST /api/agent/download-zip` - Download agent as ZIP

### Key Management
- `GET /api/keys` - List stored keys (masked)
- `POST /api/keys` - Store a key
- `DELETE /api/keys/:service` - Remove a key
- `POST /api/keys/validate` - Test if a key works

### BrainIngestion
- `POST /api/ingest` - Ingest document into ChromaDB
- `POST /api/retrieve` - Search documents
- `GET /api/collections` - List collections
- `DELETE /api/collections/:name` - Delete collection

### Marketplace
- `GET /api/marketplace/posts` - Get social feed
- `POST /api/marketplace/post` - Create post

### Utilities
- `POST /api/copilot/chat` - AI copilot assistance
- `POST /api/copilot/synthesize-skill` - Generate custom skill
- `GET /api/audit-integrity` - Check configured integrations
- `POST /api/agent/execute-capability` - Execute capability
- `POST /api/agent/dispatch-webhook` - Test webhook

## License

MIT + Commercial License

## Support

- Documentation: SETUP.md
- Issues: GitHub Issues
- Email: support@buyasoul.online

## GSK Phases 0.1 - 230 Multiverse Engine

This repository contains the complete implementation of the **Grand Soul Kernel (GSK)** expanded across **230 total phases (0.1 - 230)**:

- **Express Router Endpoints**: `src/routers/soulEngine.ts` exposes API endpoints for all phases 0.1 through 230.
- **OmniRouter Service**: `src/lib/omniRouterService.ts` & `src/routers/omniRoute.ts` implement the model fallback chain (`NVIDIA` → `Google` → `OpenAI` → `Groq` → `OpenRouter` → `Bedrock`) configured via `OMNIROUTER_URL` on Render free tier.
- **GSK MCP Client**: `src/lib/gskMcpClient.ts` wires all phase calls through MCP to GSK on Render (`port 3001/4491`).
- **12-Tab Multiverse UI**: All 12 tabs are active in `src/App.tsx` and `src/components/`, integrating the **PLT Framework** (`Profit + Love - Tax = True Value`).
