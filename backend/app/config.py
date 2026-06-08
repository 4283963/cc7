from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 9000
    clickhouse_user: str = "default"
    clickhouse_password: str = ""
    clickhouse_database: str = "cold_chain"

    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_database: str = "cold_chain"

    api_port: int = 8000

    temperature_threshold: float = -10.0
    temp_spike_threshold: float = 8.0

    class Config:
        env_file = ".env"


settings = Settings()
