#!/bin/bash
# MADAD Setup Script

set -e  # Exit on error

echo "========================================="
echo "MADAD Disaster Relief System Setup"
echo "========================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "Please edit .env file with your configuration"
    echo "1. Set your GROQ_API_KEY or QWEN_API_KEY"
    echo "2. Change JWT_SECRET for production"
    echo "3. Update EXPO_PUBLIC_API_BASE_URL if needed"
    read -p "Press Enter after editing .env file..."
fi

# Setup Backend
echo ""
echo "Setting up Backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Initialize database
echo "Initializing database..."
python -c "from app.db.session import init_db; init_db()"

cd ..

# Setup Frontend
echo ""
echo "Setting up Frontend..."
cd frontend

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

cd ..

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "To start the backend:"
echo "  cd backend"
echo "  source venv/bin/activate  # On Windows: venv\Scripts\activate"
echo "  python -m uvicorn app.main:app --reload --port 8000"
echo ""
echo "To start the frontend:"
echo "  cd frontend"
echo "  npm start"
echo ""
echo "Default login credentials:"
echo "  Center Code: RJP-01"
echo "  Username: bilal"
echo "  Password: bilal123"
echo ""
echo "API Documentation: http://localhost:8000/docs"
echo "Health Check: http://localhost:8000/health"