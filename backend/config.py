from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "sqlite+aiosqlite:///./danbooru.db"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"

    # Danbooru 账号（选填，有账号可解锁更高频率和敏感内容）
    danbooru_username: str = ""
    danbooru_api_key: str = ""

    # 爬取配置
    crawl_interval_hours: int = 24
    crawl_batch_size: int = 1000
    crawl_request_interval: float = 0.5  # 两次请求间隔秒数

    # 翻译配置
    translate_batch_size: int = 50  # 每批翻译 tag 数量


settings = Settings()
