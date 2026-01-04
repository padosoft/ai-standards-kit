"""Centralized configuration management with validation."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class DBConfig:
    """MySQL database connection configuration."""
    host: str
    port: int
    name: str
    user: str
    password: str
    pool_size: int = 5
    pool_recycle: int = 3600  # seconds


@dataclass(frozen=True)
class ArtifactsConfig:
    """Artifact storage configuration."""
    base_dir: str
    max_patch_bytes: int = 2 * 1024 * 1024      # 2MB
    max_log_bytes: int = 1 * 1024 * 1024        # 1MB
    max_total_bytes: int = 10 * 1024 * 1024     # 10MB per run


@dataclass(frozen=True)
class SecurityConfig:
    """Security policy configuration."""
    blocked_commands: tuple[str, ...] = (
        "rm -rf", "rm -r /", "curl|bash", "wget|sh",
        "dd if=", "> /dev/", "mkfs", ":(){ :|:& };:",
        "chmod -R 777", "sudo rm", "sudo dd",
    )
    allowed_path_prefixes: tuple[str, ...] = ("./.ai/tmp/", "./src/", "./tests/")
    blocked_path_patterns: tuple[str, ...] = ("../",)


@dataclass(frozen=True)
class OrchestratorConfig:
    """Main orchestrator configuration."""
    db: DBConfig
    artifacts: ArtifactsConfig
    security: SecurityConfig = field(default_factory=SecurityConfig)
    repo_root: str = ""
    default_max_retries: int = 3
    default_timeout_seconds: int = 300


def load_config() -> OrchestratorConfig:
    """Load configuration from environment variables."""
    repo_root = os.environ.get("AI_ORCH_REPO_ROOT")
    if not repo_root:
        raise RuntimeError("AI_ORCH_REPO_ROOT is not set (absolute path to repo root).")

    artifacts_dir = os.environ.get("AI_ORCH_ARTIFACTS_DIR", "/tmp/ai-orch-artifacts")

    return OrchestratorConfig(
        db=DBConfig(
            host=os.environ.get("AI_ORCH_DB_HOST", "127.0.0.1"),
            port=int(os.environ.get("AI_ORCH_DB_PORT", "3306")),
            name=os.environ.get("AI_ORCH_DB_NAME", "ai_orch"),
            user=os.environ.get("AI_ORCH_DB_USER", "ai_orch"),
            password=os.environ.get("AI_ORCH_DB_PASS", ""),
            pool_size=int(os.environ.get("AI_ORCH_DB_POOL_SIZE", "5")),
        ),
        artifacts=ArtifactsConfig(
            base_dir=artifacts_dir,
            max_patch_bytes=int(os.environ.get("AI_ORCH_MAX_PATCH_BYTES", str(2 * 1024 * 1024))),
            max_log_bytes=int(os.environ.get("AI_ORCH_MAX_LOG_BYTES", str(1 * 1024 * 1024))),
        ),
        repo_root=repo_root,
        default_max_retries=int(os.environ.get("AI_ORCH_MAX_RETRIES", "3")),
        default_timeout_seconds=int(os.environ.get("AI_ORCH_TIMEOUT_SECONDS", "300")),
    )


# Singleton config instance
_config: Optional[OrchestratorConfig] = None


def get_config() -> OrchestratorConfig:
    """Get or create the global configuration instance."""
    global _config
    if _config is None:
        _config = load_config()
    return _config
