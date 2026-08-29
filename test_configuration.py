#!/usr/bin/env python3
"""
Comprehensive test of the MADAD configuration system.
Tests environment variables, AI providers, and database configuration.
"""

import os
import sys
import json
import asyncio
from pathlib import Path

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_environment_setup():
    """Test that environment files are set up correctly."""
    print("=" * 60)
    print("Testing Environment Setup")
    print("=" * 60)
    
    # Check for required files
    env_files = [
        (".env.example", "Environment template"),
        (".env", "Environment configuration"),
        ("backend/.env", "Backend environment symlink")
    ]
    
    all_good = True
    for file_path, description in env_files:
        if Path(file_path).exists():
            print(f"✅ {description}: {file_path} exists")
        else:
            print(f"❌ {description}: {file_path} missing")
            all_good = False
    
    return all_good

def test_configuration_loading():
    """Test that configuration loads correctly from environment."""
    print("\n" + "=" * 60)
    print("Testing Configuration Loading")
    print("=" * 60)
    
    try:
        from app.core.config import settings
        
        print("✅ Configuration loaded successfully")
        
        # Test key configurations
        tests = [
            ("PROJECT_NAME", settings.PROJECT_NAME, str),
            ("API_V1_STR", settings.API_V1_STR, str),
            ("DATABASE_URL", settings.DATABASE_URL, str),
            ("EXTRACTION_PROVIDER", settings.EXTRACTION_PROVIDER, str),
            ("JWT_SECRET", settings.JWT_SECRET, str),
            ("JWT_ALGORITHM", settings.JWT_ALGORITHM, str),
            ("JWT_EXPIRY_MINUTES", settings.JWT_EXPIRY_MINUTES, int),
        ]
        
        for name, value, expected_type in tests:
            if isinstance(value, expected_type):
                print(f"✅ {name}: {value} (type: {type(value).__name__})")
            else:
                print(f"❌ {name}: Wrong type. Got {type(value).__name__}, expected {expected_type.__name__}")
        
        # Check AI provider configuration
        print(f"\nAI Provider Configuration:")
        print(f"  Provider: {settings.EXTRACTION_PROVIDER}")
        
        if settings.EXTRACTION_PROVIDER == "groq":
            if settings.GROQ_API_KEY and settings.GROQ_API_KEY != "your_groq_api_key_here":
                print(f"  ✅ GROQ_API_KEY: Configured")
            else:
                print(f"  ⚠️  GROQ_API_KEY: Not configured or using default")
        elif settings.EXTRACTION_PROVIDER == "qwen":
            if settings.QWEN_API_KEY and settings.QWEN_API_KEY != "your_alibaba_cloud_key_here":
                print(f"  ✅ QWEN_API_KEY: Configured")
            else:
                print(f"  ⚠️  QWEN_API_KEY: Not configured or using default")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to load configuration: {e}")
        return False

def test_ai_providers():
    """Test that AI providers are properly configured."""
    print("\n" + "=" * 60)
    print("Testing AI Provider Configuration")
    print("=" * 60)
    
    try:
        from app.core.config import settings
        from app.api.deps import get_extraction_provider
        
        # Get the configured provider
        provider = get_extraction_provider()
        provider_name = provider.__class__.__name__
        
        print(f"✅ AI Provider configured: {provider_name}")
        
        # Test provider-specific configuration
        if provider_name == "GroqProvider":
            from app.services.extraction.groq_provider import GroqProvider
            groq_provider = GroqProvider()
            print(f"  API URL: {groq_provider.api_url}")
            print(f"  Model: {groq_provider.model}")
            
        elif provider_name == "QwenProvider":
            from app.services.extraction.qwen_provider import QwenProvider
            qwen_provider = QwenProvider()
            print(f"  API URL: {qwen_provider.api_url}")
            print(f"  Model: {qwen_provider.model}")
            
        elif provider_name == "GemmaProvider":
            from app.services.extraction.gemma_provider import GemmaProvider
            gemma_provider = GemmaProvider()
            print(f"  OLLAMA URL: {gemma_provider.ollama_url}")
            print(f"  Model: {gemma_provider.model}")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to test AI providers: {e}")
        return False

async def test_database_connection():
    """Test database connection and initialization."""
    print("\n" + "=" * 60)
    print("Testing Database Configuration")
    print("=" * 60)
    
    try:
        from app.db.session import SessionLocal, init_db
        from app.db.models import Base
        
        from sqlalchemy import text
        # Test database connection
        db = SessionLocal()
        try:
            # Simple query to test connection
            result = db.execute(text("SELECT 1"))
            print("✅ Database connection successful")
            
            # Test table creation
            print("Testing table creation...")
            init_db()
            print("✅ Database initialization successful")
            
            return True
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def test_frontend_configuration():
    """Test frontend environment configuration."""
    print("\n" + "=" * 60)
    print("Testing Frontend Configuration")
    print("=" * 60)
    
    frontend_env_path = Path("frontend/.env")
    frontend_env_example_path = Path("frontend/.env.example")
    
    if frontend_env_example_path.exists():
        print("✅ Frontend .env.example exists")
        
        # Check if .env file exists
        if frontend_env_path.exists():
            print("✅ Frontend .env file exists")
            
            # Read and check key variables
            try:
                with open(frontend_env_path, 'r') as f:
                    content = f.read()
                    
                if "EXPO_PUBLIC_API_BASE_URL" in content:
                    print("✅ EXPO_PUBLIC_API_BASE_URL configured")
                else:
                    print("❌ EXPO_PUBLIC_API_BASE_URL not found in .env")
                    
                return True
                
            except Exception as e:
                print(f"❌ Error reading frontend .env: {e}")
                return False
        else:
            print("⚠️  Frontend .env file does not exist (create from .env.example)")
            return False
    else:
        print("❌ Frontend .env.example missing")
        return False

def generate_next_steps():
    """Generate next steps for configuration."""
    print("\n" + "=" * 60)
    print("Next Steps for Configuration")
    print("=" * 60)
    
    from app.core.config import settings
    
    steps = []
    
    # Check JWT secret
    if settings.JWT_SECRET == "change_this_to_a_secure_random_string_in_production":
        steps.append("1. Change JWT_SECRET in .env file for production security")
    
    # Check AI provider API key
    if settings.EXTRACTION_PROVIDER == "groq":
        if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "your_groq_api_key_here":
            steps.append("2. Add your GROQ_API_KEY to .env file")
    elif settings.EXTRACTION_PROVIDER == "qwen":
        if not settings.QWEN_API_KEY or settings.QWEN_API_KEY == "your_alibaba_cloud_key_here":
            steps.append("2. Add your QWEN_API_KEY to .env file")
    
    # Check frontend configuration
    frontend_env = Path("frontend/.env")
    if not frontend_env.exists():
        steps.append("3. Create frontend/.env from frontend/.env.example")
    
    # Check database configuration
    if "sqlite" in settings.DATABASE_URL.lower():
        steps.append("4. Consider switching to PostgreSQL for production (update DATABASE_URL)")
    
    if steps:
        print("Configuration improvements needed:")
        for step in steps:
            print(f"  • {step}")
    else:
        print("✅ All configurations are properly set up!")
    
    print("\nQuick setup commands:")
    print("  Backend: cd backend && python -m uvicorn app.main:app --reload --port 8000")
    print("  Frontend: cd frontend && npm start")
    print("\nDefault login: Center=RJP-01, Username=bilal, Password=bilal123")

async def main():
    """Run all tests."""
    print("MADAD Configuration Test Suite")
    print("=" * 60)
    
    results = []
    
    # Run tests
    results.append(("Environment Files", test_environment_setup()))
    results.append(("Configuration Loading", test_configuration_loading()))
    results.append(("AI Providers", test_ai_providers()))
    results.append(("Database", await test_database_connection()))
    results.append(("Frontend Config", test_frontend_configuration()))
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if success:
            passed += 1
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    # Generate next steps
    generate_next_steps()
    
    return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)