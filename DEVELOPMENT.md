# Development Guide - Agent AI SPH Generator

## Project Overview

Agent AI adalah sistem untuk membuat Surat Penawaran Harga (SPH) secara otomatis menggunakan AI. Project ini menggunakan arsitektur modular dengan:

- **Backend**: Node.js + Express + MCP (Model Context Protocol)
- **Frontend**: React + TypeScript + Tailwind CSS
- **Database**: SQLite (development) / PostgreSQL (production)
- **AI Integration**: Custom LLM API

## Architecture

```
agent-ai/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth & error handling
│   │   ├── database/       # Database setup & queries
│   │   ├── mcp/           # MCP server & tools
│   │   └── types/         # TypeScript types
│   └── uploads/           # Generated documents
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── utils/         # Utility functions
│   │   └── types/         # TypeScript types
└── shared/                # Shared utilities (future)
```

## Key Features Implemented

### ✅ MVP Features
1. **Authentication System**
   - JWT-based auth
   - User registration/login
   - Protected routes

2. **AI Chat Interface**
   - ChatGPT-like interface
   - Session management
   - Real-time messaging

3. **SPH Generation**
   - Template-based generation
   - PDF export
   - Document preview

4. **Document Management**
   - List, view, delete documents
   - Status tracking
   - File downloads

### 🔄 MCP Tools
1. **generate_sph**: Generate SPH documents
2. **validate_sph_data**: Validate SPH input data
3. **format_currency**: Format Indonesian Rupiah

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Quick Start
```bash
# Clone and setup
git clone <repo-url>
cd agent-ai
chmod +x setup.sh
./setup.sh

# Configure environment
cp backend/env.example backend/.env
# Edit backend/.env with your settings

# Start development
npm run dev
```

### Manual Setup
```bash
# Install dependencies
npm run install:all

# Build backend
cd backend && npm run build && cd ..

# Start development servers
npm run dev
```

## Environment Configuration

### Backend (.env)
```env
# Server
PORT=3001
NODE_ENV=development

# Security
JWT_SECRET=your-super-secret-key

# Database
DB_PATH=./data/database.sqlite

# LLM API
LLM_API_URL=http://your-llm-endpoint
LLM_API_KEY=your-api-key

# Company Info
COMPANY_NAME=PT. Your Company
COMPANY_ADDRESS=Your Address
COMPANY_PHONE=+62-21-xxxxxxxx
COMPANY_EMAIL=info@company.com
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Documents
- `GET /api/documents` - List documents
- `GET /api/documents/:id` - Get document
- `POST /api/documents/generate-sph` - Generate SPH
- `PATCH /api/documents/:id/status` - Update status
- `DELETE /api/documents/:id` - Delete document

### AI Chat
- `GET /api/ai/sessions` - List chat sessions
- `POST /api/ai/sessions` - Create session
- `GET /api/ai/sessions/:id/messages` - Get messages
- `POST /api/ai/chat` - Send message

## Database Schema

### Users
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Documents
```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  data TEXT,
  status TEXT DEFAULT 'draft',
  file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);
```

### Chat Sessions & Messages
```sql
CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions (id)
);
```

## MCP Integration

### Server Setup
MCP server runs on separate process and communicates via stdio:
```typescript
// Start MCP server
export async function startMCPServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
```

### Available Tools
1. **generate_sph**: Creates SPH document with HTML/PDF output
2. **validate_sph_data**: Validates input data before generation
3. **format_currency**: Formats numbers as IDR currency

## Frontend Architecture

### State Management
- React Context for auth state
- Local state for component data
- API integration with axios

### Routing
```typescript
// Protected routes
<Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
<Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
<Route path="/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
```

### Components Structure
```
components/
├── Layout.tsx          # Main layout with sidebar
├── ProtectedRoute.tsx  # Route protection
├── LoadingSpinner.tsx  # Loading states
└── ...
```

## Testing

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

## Deployment

### Production Build
```bash
npm run build
```

### Environment Variables
Set production environment variables:
- Database connection
- JWT secret
- LLM API credentials
- Company information

### Docker (Future)
```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm run install:all
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## Future Enhancements

### Phase 2
- [ ] WhatsApp integration
- [ ] Customer profile tools
- [ ] Advanced templates
- [ ] Multi-language support

### Phase 3
- [ ] Multi-tenant support
- [ ] API rate limiting
- [ ] Document versioning
- [ ] Audit trails
- [ ] Analytics dashboard

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill process on port
   lsof -ti:3001 | xargs kill -9
   ```

2. **Database locked**
   ```bash
   # Remove lock file
   rm backend/data/database.sqlite-wal
   ```

3. **MCP connection issues**
   - Check MCP server logs
   - Verify stdio transport setup

4. **Build errors**
   ```bash
   # Clean install
   rm -rf node_modules package-lock.json
   npm install
   ```

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## License

MIT License - see LICENSE file for details


