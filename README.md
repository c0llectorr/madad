# **MADAD**

AI-assisted disaster relief coordination system. Extracts structured needs from field reports, prioritizes affected sites, and plans/replans delivery routes around road damage in real time. Built for the Bano Qabil Alibaba Cloud AI Hackathon 2026.

## Quick Start

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit with your configuration
# nano .env  # or use your preferred editor
```

### 2. Configure AI Provider
Edit `.env` and set your API key:
```bash
# For GROQ (Recommended)
EXTRACTION_PROVIDER="groq"
GROQ_API_KEY="your_groq_api_key_here"

# OR for Qwen/Qwen++
EXTRACTION_PROVIDER="qwen"
QWEN_API_KEY="your_alibaba_cloud_key_here"
```

### 3. Start Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### 4. Start Frontend
```bash
cd frontend
npm install
npm start
```

## Project Structure
```
madad/
├── backend/          # FastAPI backend
├── frontend/         # React Native/Expo frontend
├── database/         # Database schemas and scripts
├── docs/            # Documentation
├── .env.example     # Environment template
└── README.md        # This file
```

## Documentation
- [Backend Setup](./backend/README.md)
- [Frontend Setup](./frontend/README.md)
- [Database Setup](./database/README.md)
- [API Contract](./docs/API_CONTRACT.md)

## Environment Variables
See [.env.example](./.env.example) for complete configuration options.