from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "MADAD Disaster Relief Coordination Backend"
    API_V1_STR: str = "/api"
    
    DATABASE_URL: str = "sqlite:///./madad.db"
    SQLITE_CACHE_PATH: str = "./local_cache.db"
    
    EXTRACTION_PROVIDER: str = "qwen"  # "qwen" | "gemma"
    QWEN_API_KEY: str = ""
    QWEN_API_URL: str = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
    QWEN_MODEL: str = "qwen-plus"
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gemma:4b"
    
    JWT_SECRET: str = "madad_district_command_jwt_secret_key_2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 480
    
    CORS_ORIGINS: List[str] = ["*"]
    
    GRAPH_PATH: str = "../database/geodata/demo_region.graphml"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
