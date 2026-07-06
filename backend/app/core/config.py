from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str | None = None
    jwt_access_ttl: int = 900
    jwt_refresh_ttl: int = 2_592_000
    google_oauth_client_id: str | None = None
    google_oauth_client_secret: str | None = None
    cors_allowed_origins: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

    def require_jwt_secret(self) -> str:
        if not self.jwt_secret:
            raise RuntimeError("JWT_SECRET must be set")
        return self.jwt_secret


settings = Settings()  # type: ignore[call-arg]
