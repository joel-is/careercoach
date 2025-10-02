# Career Coach

AI-powered career coaching application that helps users find their ideal job by analyzing their resume and LinkedIn profile, then matching them with real LinkedIn job opportunities.

## Features

- **Resume upload and analysis** (PDF)
- **LinkedIn profile integration** for enhanced matching
- **AI-powered conversational agent** that asks guiding questions
- **Real LinkedIn job search** via MCP server integration
- **Intelligent job filtering and ranking** based on qualifications
- **Detailed match explanations** for each job
- Clean, modern browser interface

## Prerequisites

- Node.js (v18 or higher)
- Docker (for LinkedIn MCP server)
- Anthropic API key
- LinkedIn session cookie (`li_at`)

## Setup

### 1. Install dependencies:
```bash
npm install
```

### 2. Get your LinkedIn cookie:

The application uses the [linkedin-mcp-server](https://github.com/stickerdaniel/linkedin-mcp-server) to search real LinkedIn jobs. You need your LinkedIn session cookie:

**Chrome/Edge:**
1. Log into LinkedIn
2. Open Developer Tools (F12)
3. Go to Application tab → Cookies → https://www.linkedin.com
4. Find `li_at` cookie and copy its value

**Note:** The cookie expires after 30 days and is for personal use only.

### 3. Create a `.env` file:
```bash
cp .env.example .env
```

### 4. Add your credentials to `.env`:
```
ANTHROPIC_API_KEY=your_anthropic_api_key
LINKEDIN_COOKIE=your_li_at_cookie_value
PORT=3000
```

## Running the Application

Start both the backend server and frontend:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## How It Works

1. **Upload Resume & LinkedIn Profile**: User uploads their resume (PDF) and optionally provides their LinkedIn profile URL
2. **Profile Enrichment**: If provided, the system fetches comprehensive LinkedIn profile data via MCP server
3. **AI Analysis**: Claude analyzes both resume and LinkedIn profile for a complete picture
4. **Guided Questions**: AI asks contextual questions to understand ideal role preferences
5. **Real Job Search**: Searches LinkedIn using the MCP server with personalized criteria
6. **Intelligent Filtering**: Claude filters and ranks jobs based on qualifications and preferences
7. **Results**: Displays personalized job matches with detailed explanations

## Architecture

### Backend (Node.js + Express):
- `server/index.js` - Main server with API endpoints
- `server/agent.js` - AI career coach agent with LinkedIn integration
- `server/linkedinMCP.js` - MCP client wrapper for LinkedIn server
- `server/resumeParser.js` - PDF resume parsing
- `server/jobSearch.js` - Real LinkedIn job search with AI filtering

### Frontend (Vanilla JS + Vite):
- `index.html` - Main UI with LinkedIn profile input
- `main.js` - Client-side logic
- `vite.config.js` - Dev server configuration

### External Services:
- **LinkedIn MCP Server** (Docker): Real-time LinkedIn data access
- **Claude API**: AI-powered analysis, conversation, and matching
- **Docker**: Runs the linkedin-mcp-server container

## API Endpoints

- `POST /api/upload-resume` - Upload resume and optionally LinkedIn profile URL
- `POST /api/chat` - Send message to AI career coach
- `POST /api/search-jobs` - Search LinkedIn jobs with intelligent filtering

## LinkedIn MCP Server Integration

The application uses the [linkedin-mcp-server](https://github.com/stickerdaniel/linkedin-mcp-server) via Docker to:

- **Fetch LinkedIn profiles** - Get comprehensive profile data
- **Search jobs** - Real-time LinkedIn job search
- **Get job details** - Detailed information for specific postings
- **Get recommendations** - Personalized job recommendations

The MCP server is spawned automatically when needed and communicates via stdio transport.

## Fallback Behavior

If the LinkedIn MCP server is unavailable or fails, the system automatically falls back to generating mock job listings using Claude to ensure the application continues to function.
