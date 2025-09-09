# Agent AI - SPH Generator

AI Agent untuk membuat Surat Penawaran Harga (SPH) secara otomatis.

## Fitur

### MVP (Phase 1)
- ✅ Authentication system
- ✅ AI Chat interface (seperti ChatGPT)
- ✅ Generate SPH dokumen dengan parameter:
  - Nama Pelanggan
  - Tanggal SPH
  - Layanan (multiple)
  - Biaya PSB, Abodemen, Diskon
  - Lampiran
- ✅ Document viewer/editor dengan tanda tangan

### Future Features (Phase 2+)
- WhatsApp integration
- Customer profile checker
- Additional MCP tools
- Advanced document templates

## Tech Stack

- **Backend**: Node.js + Express + MCP (Model Context Protocol)
- **Frontend**: React + TypeScript
- **Auth**: JWT-based authentication
- **Database**: SQLite/PostgreSQL
- **AI**: Custom LLM API integration

## Project Structure

```
agent-ai/
├── backend/          # Node.js backend with MCP
├── frontend/         # React frontend
├── shared/           # Shared types and utilities
└── docs/            # Documentation
```

## Getting Started

1. Install dependencies:
```bash
npm run install:all
```

2. Setup environment variables (see .env.example)

3. Start development:
```bash
npm run dev
```

## Development Phases

### Phase 1: MVP
1. Project setup ✅
2. Backend with auth & MCP
3. Frontend chat interface
4. SPH generation tool
5. Document viewer

### Phase 2: Enhancement
1. WhatsApp integration
2. Customer profile tools
3. Advanced templates
4. Analytics dashboard

### Phase 3: Scale
1. Multi-tenant support
2. API rate limiting
3. Document versioning
4. Audit trails


