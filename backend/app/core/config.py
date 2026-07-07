from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str | None = None
    jwt_access_ttl: int = 900
    jwt_refresh_ttl: int = 2_592_000
    google_oauth_client_id: str | None = None
    google_oauth_client_secret: str | None = None
    cors_allowed_origins: str = ""
    invite_ttl: int = 604_800
    frontend_base_url: str = ""
    rate_limit_enabled: bool = False
    rate_limit_login_per_minute: int = 10
    rate_limit_signup_per_minute: int = 5
    rate_limit_google_per_minute: int = 10
    rate_limit_refresh_per_minute: int = 30
    rate_limit_invite_accept_per_minute: int = 10
    max_request_body_bytes: int = 1_048_576

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

    def require_jwt_secret(self) -> str:
        if not self.jwt_secret:
            raise RuntimeError("JWT_SECRET must be set")
        return self.jwt_secret


settings = Settings()  # type: ignore[call-arg]
