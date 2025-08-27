# CBO Banking App PoC

## Central Bank of Oman AI-Powered Document Analyzer & Conversational Chatbot

This is a Proof of Concept (PoC) for an AI-powered banking application that integrates with Vectara to provide intelligent document analysis and conversational AI capabilities for the Central Bank of Oman.

> Quick links: [Local Setup](#local-setup-quickstart) · [Git: Push to your repo](#git-push-to-your-repository)

## Local Setup (Quickstart)

- **Backend (FastAPI)**
  1. `cd backend`
  2. `pip install -r requirements.txt`
  3. Copy env: `cp .env.example .env` (then fill Vectara creds)
  4. Run: `uvicorn main:app --reload --port 8000`

- **Frontend (Next.js)**
  1. `cd frontend`
  2. `npm install`
  3. `npm run dev` (http://localhost:3000)

> Environment variables: see `backend/.env.example`. Do not commit `.env` files.

### One-command local dev

You can start both backend and frontend together via the unified dev server:

```bash
python dev-server.py
```

## 🎯 Project Overview

### Core Features
- **AI-Powered Chatbot**: Multilingual (Arabic/English) conversational AI with RAG capabilities
- **Document Analyzer**: Intelligent document processing with OCR and metadata extraction
- **Secure Authentication**: SSO integration with role-based access control
- **Hybrid Deployment**: On-premise processing with optional cloud overflow
- **Compliance Ready**: Built with ISO 27001 and data residency requirements in mind

### Technology Stack
- **Backend**: FastAPI (Python) with Vectara integration
- **Frontend**: Next.js with React and TypeScript
- **AI Platform**: Vectara for RAG and document processing
- **Deployment**: Vercel for frontend and serverless functions

## 📁 Project Structure

```
cbo-poc/
├── backend/                 # FastAPI backend application
│   ├── main.py             # Main FastAPI application
│   ├── vectara_client.py   # Vectara API integration
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment variables template
├── frontend/               # Next.js React frontend
│   ├── src/pages/         # Page components
│   ├── package.json       # Node.js dependencies
│   ├── next.config.js     # Next.js configuration
│   └── tailwind.config.js # Tailwind CSS configuration
└── dev-server.py           # Unified local dev runner
```

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- Vectara account and API credentials

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your Vectara credentials
   ```

4. **Run the FastAPI server**:
   ```bash
   python main.py
   # Or use uvicorn: uvicorn main:app --reload
   ```

   The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:3000`

## 🔐 Authentication

### Demo Credentials
- **Admin**: `admin` / `admin123`
- **User**: `user1` / `user123`

### API Authentication
All API endpoints (except login) require a Bearer token:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:8000/chat
```

## 🤖 Vectara Integration

### Environment Variables
Set these in your `.env` file:
```bash
VECTARA_CUSTOMER_ID=your-customer-id
VECTARA_CORPUS_ID=your-corpus-id
VECTARA_API_KEY=your-api-key
```

### Features
- **Document Ingestion**: Upload documents for AI analysis
- **RAG Queries**: Ask questions about uploaded documents
- **Multilingual Support**: Arabic and English language processing
- **Source Attribution**: Get references to source documents

## 📱 Frontend Features

### Pages
- **Login Page** (`/`): Secure authentication
- **Dashboard** (`/dashboard`): Overview and quick actions
- **AI Chat** (`/chat`): Conversational AI interface
- **Documents** (`/documents`): Document management (planned)

### Key Components
- Responsive design with Tailwind CSS
- Arabic/English language toggle
- Real-time chat interface
- Source attribution display
- Toast notifications for user feedback

## 🚀 Deployment

### Vercel Deployment
1. **Connect your Git repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy frontend** automatically on push
4. **Deploy backend** as Vercel serverless functions

### Environment Variables for Production
```bash
# JWT Secret
JWT_SECRET_KEY=your-production-secret

# Vectara Configuration
VECTARA_CUSTOMER_ID=your-customer-id
VECTARA_CORPUS_ID=your-corpus-id
VECTARA_API_KEY=your-api-key

# Frontend API URL
NEXT_PUBLIC_API_URL=https://your-api-domain.vercel.app
```

## 📋 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user info

### Chat & AI
- `POST /chat` - Send message to AI chatbot
- `POST /documents/upload` - Upload document for analysis
- `GET /documents` - List available documents

### System
- `GET /` - Health check
- `GET /health` - Detailed system status

## 🔧 Development

### Code Structure
- **Backend**: RESTful API with FastAPI
- **Frontend**: React components with TypeScript

### Key Features Implemented
- ✅ JWT-based authentication
- ✅ Vectara AI integration
- ✅ Bilingual chat interface
- ✅ Document upload and processing
- ✅ Responsive UI design

## 📖 Documentation

- [API Documentation](http://localhost:8000/docs) - Interactive API docs (when running)

## 📄 License

This is a Proof of Concept project for the Central Bank of Oman.

## 📞 Support

For questions or issues:
- Review API documentation at `/docs` endpoint

---

**Built with ❤️ for the Central Bank of Oman**

## Git: Push to your repository

1. Initialize and commit
   ```bash
   git init
   git add .
   git commit -m "Initial commit: CBO PoC"
   ```
2. Add remote and push (replace placeholders)
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-org>/<your-repo>.git
   git push -u origin main
   ```

> This repo includes a `.gitignore` for Python, FastAPI, Node/Next.js, and Playwright to exclude large/build/local-only artifacts (e.g., `node_modules`, `.next`, `__pycache__`, `.env`, test reports, local DB, downloads).
