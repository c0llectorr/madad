@echo off
echo =========================================
echo MADAD Disaster Relief System Setup
echo =========================================

REM Check if .env file exists
if not exist ".env" (
    echo Creating .env file from template...
    copy .env.example .env
    echo Please edit .env file with your configuration
    echo 1. Set your GROQ_API_KEY or QWEN_API_KEY
    echo 2. Change JWT_SECRET for production
    echo 3. Update EXPO_PUBLIC_API_BASE_URL if needed
    pause
)

REM Setup Backend
echo.
echo Setting up Backend...
cd backend

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

REM Initialize database
echo Initializing database...
python -c "from app.db.session import init_db; init_db()"

cd ..

REM Setup Frontend
echo.
echo Setting up Frontend...
cd frontend

REM Install Node.js dependencies
echo Installing Node.js dependencies...
npm install

cd ..

echo.
echo =========================================
echo Setup Complete!
echo =========================================
echo.
echo To start the backend:
echo   cd backend
echo   venv\Scripts\activate
echo   python -m uvicorn app.main:app --reload --port 8000
echo.
echo To start the frontend:
echo   cd frontend
echo   npm start
echo.
echo Default login credentials:
echo   Center Code: RJP-01
echo   Username: bilal
echo   Password: bilal123
echo.
echo API Documentation: http://localhost:8000/docs
echo Health Check: http://localhost:8000/health
pause