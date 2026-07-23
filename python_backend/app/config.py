from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "High Throughput Distributed URL Shortener and Analytics Engine"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    BASE_URL: str = "http://127.0.0.1:8000"
    
    # Postgres
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres_secure_pass@localhost:5432/url_shortener"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_TTL_SECONDS: int = 300
    
    # Security / Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
