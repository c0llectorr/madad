from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # FastAPI Application
    PROJECT_NAME: str = "MADAD"
    API_V1_STR: str = "/api"
    
    # Database Configuration
    DATABASE_URL: str = "postgresql://postgres:124357@localhost:5432/madad1"
    
    # AI Extraction Provider Configuration
    EXTRACTION_PROVIDER: str = "groq"  # "qwen" | "gemma" | "groq"
    
    # Qwen/Qwen++ Configuration
    QWEN_API_KEY: str = ""
    QWEN_API_URL: str = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
    QWEN_MODEL: str = "qwen-plus"
    
    # Groq Configuration
    GROQ_API_KEY: str = ""
    GROQ_API_URL: str = "https://api.groq.com/openai/v1/chat/completions"
    GROQ_MODEL: str = "mixtral-8x7b-32768"  # Options: mixtral-8x7b-32768, llama2-70b-4096, gemma-7b-it
    
    # Ollama/Gemma Configuration
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gemma:4b"
    
    # JWT Authentication
    JWT_SECRET: str = "change_this_to_a_secure_random_string_in_production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 480
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = ["*"]
    
    # Geographic Data
    GRAPH_PATH: str = "../database/geodata/demo_region.graphml"
    
    # Development Flags
    LOG_LEVEL: str = "INFO"
    ENABLE_AI_EXTRACTION: bool = True
    ENABLE_DEBUG_ROUTES: bool = True
    
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
