# MADAD Backend

FastAPI backend for the MADAD disaster relief coordination system.

## Setup

### 1. Environment Setup

Copy the example environment file and configure it:

```bash
# Copy the example environment file
cp ../.env.example .env

# Edit the .env file with your configuration
# nano .env  # or use your preferred editor
```

### 2. Install Dependencies

```bash
# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Edit the `.env` file with your configuration:

#### Database Configuration
```bash
# PostgreSQL (required)
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/madad"
```

#### AI Extraction Provider
Choose one provider and set its API key:

```bash
# For GROQ (Recommended)
EXTRACTION_PROVIDER="groq"
GROQ_API_KEY="your_groq_api_key_here"

# For Qwen/Qwen++
EXTRACTION_PROVIDER="qwen"
QWEN_API_KEY="your_alibaba_cloud_key_here"

# For Ollama/Gemma (Local)
EXTRACTION_PROVIDER="gemma"
```

#### JWT Security
```bash
# Generate a secure secret for production
JWT_SECRET="change_this_to_a_secure_random_string_in_production"
```

#### Frontend Configuration
```bash
# Update based on your network
CORS_ORIGINS="http://localhost:8081,http://192.168.1.*"
```

### 4. Initialize Database

```bash
# The database will be automatically initialized when the server starts
# Or manually initialize:
python -c "from app.db.session import init_db; init_db()"
```

### 5. Run the Server

```bash
# Development mode with auto-reload
python -m uvicorn app.main:app --reload --port 8000

# Production mode
# python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 6. Verify Installation

Open your browser and navigate to:
- API Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

## Default Accounts

When the database is initialized, these accounts are created:

| Center | Code | Username | Password | Role |
|--------|------|----------|----------|------|
| Rajanpur | RJP-01 | bilal | bilal123 | coordinator |

## Environment Variables Reference

See `../.env.example` for a complete list of available environment variables.

## Development

### Running Tests
```bash
pytest tests/
```

### API Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Logging
Log level can be controlled with `LOG_LEVEL` environment variable:
- DEBUG: Detailed debugging information
- INFO: General operational information
- WARNING: Warning messages
- ERROR: Error messages

## Troubleshooting

### Database Connection Issues
- Ensure the database server is running
- Verify `DATABASE_URL` in `.env` file
- Check database permissions

### CORS Issues
- Update `CORS_ORIGINS` to include your frontend URL
- For development: `CORS_ORIGINS="*"` (not recommended for production)

### AI Extraction Not Working
- Verify API key is set in `.env`
- Check network connectivity to AI provider
- Ensure `ENABLE_AI_EXTRACTION="true"`

## Deployment

### Production Considerations
1. Use a managed PostgreSQL instance (e.g. Alibaba Cloud ApsaraDB)
2. Set secure `JWT_SECRET`
3. Restrict `CORS_ORIGINS`
4. Use environment variables for all secrets
5. Enable proper logging
6. Consider using HTTPS