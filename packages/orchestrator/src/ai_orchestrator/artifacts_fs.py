"""Filesystem artifact management with size validation and safe path handling."""
from __future__ import annotations

import hashlib
import os
import shutil
from dataclasses import dataclass
from typing import Optional, List, Tuple

from .validators import ArtifactValidator, ValidationResult


@dataclass(frozen=True)
class ArtifactMeta:
    """Metadata for a stored artifact."""
    name: str
    path: str
    size_bytes: int
    sha256: str
    content_type: str


def sha256_file(path: str) -> str:
    """Compute SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def safe_resolve(repo_root: str, rel_path: str) -> str:
    """Resolve a repo-relative path and prevent escaping the repo root.

    Raises ValueError if the path attempts to escape.
    """
    # Normalize path separators
    normalized = rel_path.replace("\\", "/")

    # Remove leading ./ if present
    if normalized.startswith("./"):
        normalized = normalized[2:]

    abs_path = os.path.abspath(os.path.join(repo_root, normalized))
    repo_root_abs = os.path.abspath(repo_root)

    # Ensure the resolved path is within repo root
    # Use os.sep to handle Windows paths correctly
    if not (abs_path.startswith(repo_root_abs + os.sep) or abs_path == repo_root_abs):
        raise ValueError(f"Artifact path escapes repo root: {rel_path}")

    return abs_path


def guess_content_type(name: str) -> str:
    """Guess content type based on file extension."""
    lower = name.lower()
    if lower.endswith((".patch", ".diff")):
        return "text/x-diff; charset=utf-8"
    if lower.endswith(".md"):
        return "text/markdown; charset=utf-8"
    if lower.endswith(".log"):
        return "text/plain; charset=utf-8"
    if lower.endswith(".json"):
        return "application/json; charset=utf-8"
    if lower.endswith(".txt"):
        return "text/plain; charset=utf-8"
    if lower.endswith(".py"):
        return "text/x-python; charset=utf-8"
    if lower.endswith((".js", ".ts")):
        return "text/javascript; charset=utf-8"
    if lower.endswith((".yml", ".yaml")):
        return "text/yaml; charset=utf-8"
    if lower.endswith(".xml"):
        return "application/xml; charset=utf-8"
    if lower.endswith(".html"):
        return "text/html; charset=utf-8"
    if lower.endswith(".css"):
        return "text/css; charset=utf-8"
    return "application/octet-stream"


class ArtifactStore:
    """Manages artifact storage with validation."""

    def __init__(
        self,
        base_dir: str,
        repo_root: str,
        validator: Optional[ArtifactValidator] = None,
    ):
        self.base_dir = base_dir
        self.repo_root = repo_root
        self.validator = validator or ArtifactValidator()
        self._pending_sizes: List[Tuple[str, int]] = []

    def _get_step_dir(self, run_id: str, step_id: int) -> str:
        """Get directory path for a step's artifacts."""
        return os.path.join(self.base_dir, run_id, f"step-{step_id}")

    def validate_source_file(self, name: str, rel_path: str) -> ValidationResult:
        """Validate source file before copying."""
        try:
            src = safe_resolve(self.repo_root, rel_path)
        except ValueError as e:
            return ValidationResult(valid=False, error=str(e))

        if not os.path.isfile(src):
            return ValidationResult(
                valid=False,
                error=f"Artifact not found: {rel_path}",
                details={"name": name, "path": rel_path}
            )

        # Check size
        size = os.path.getsize(src)
        size_result = self.validator.validate_size(name, size)
        if not size_result.valid:
            return size_result

        return ValidationResult(valid=True, details={"size": size})

    def copy_artifact(
        self,
        run_id: str,
        step_id: int,
        name: str,
        rel_path: str,
    ) -> ArtifactMeta:
        """Copy an artifact from repo to storage.

        Raises ValueError if path is invalid or file not found.
        Raises IOError if copy fails.
        """
        src = safe_resolve(self.repo_root, rel_path)

        if not os.path.isfile(src):
            raise FileNotFoundError(f"Artifact not found: {rel_path}")

        # Check size before copying
        size = os.path.getsize(src)
        size_result = self.validator.validate_size(name, size)
        if not size_result.valid:
            raise ValueError(size_result.error)

        # Create destination directory
        dst_dir = self._get_step_dir(run_id, step_id)
        os.makedirs(dst_dir, exist_ok=True)

        # Copy with atomic rename
        dst = os.path.join(dst_dir, name)
        tmp = dst + ".tmp"

        try:
            shutil.copyfile(src, tmp)
            os.replace(tmp, dst)
        except Exception:
            # Clean up temp file if it exists
            if os.path.exists(tmp):
                os.remove(tmp)
            raise

        # Compute hash
        sha = sha256_file(dst)
        content_type = guess_content_type(name)

        # Track for total size validation
        self._pending_sizes.append((name, size))

        return ArtifactMeta(
            name=name,
            path=dst,
            size_bytes=size,
            sha256=sha,
            content_type=content_type,
        )

    def validate_total_size(self) -> ValidationResult:
        """Validate total size of pending artifacts."""
        result = self.validator.validate_total_size(self._pending_sizes)
        self._pending_sizes = []  # Reset after validation
        return result

    def list_artifacts(self, run_id: str, step_id: Optional[int] = None) -> List[ArtifactMeta]:
        """List artifacts for a run or step."""
        artifacts = []

        if step_id is not None:
            step_dir = self._get_step_dir(run_id, step_id)
            if os.path.isdir(step_dir):
                for name in os.listdir(step_dir):
                    path = os.path.join(step_dir, name)
                    if os.path.isfile(path):
                        artifacts.append(ArtifactMeta(
                            name=name,
                            path=path,
                            size_bytes=os.path.getsize(path),
                            sha256=sha256_file(path),
                            content_type=guess_content_type(name),
                        ))
        else:
            run_dir = os.path.join(self.base_dir, run_id)
            if os.path.isdir(run_dir):
                for step_name in sorted(os.listdir(run_dir)):
                    step_dir = os.path.join(run_dir, step_name)
                    if os.path.isdir(step_dir) and step_name.startswith("step-"):
                        for name in os.listdir(step_dir):
                            path = os.path.join(step_dir, name)
                            if os.path.isfile(path):
                                artifacts.append(ArtifactMeta(
                                    name=name,
                                    path=path,
                                    size_bytes=os.path.getsize(path),
                                    sha256=sha256_file(path),
                                    content_type=guess_content_type(name),
                                ))

        return artifacts

    def get_artifact(self, run_id: str, step_id: int, name: str) -> Optional[ArtifactMeta]:
        """Get a specific artifact."""
        path = os.path.join(self._get_step_dir(run_id, step_id), name)
        if not os.path.isfile(path):
            return None

        return ArtifactMeta(
            name=name,
            path=path,
            size_bytes=os.path.getsize(path),
            sha256=sha256_file(path),
            content_type=guess_content_type(name),
        )

    def delete_artifact(self, run_id: str, step_id: int, name: str) -> bool:
        """Delete an artifact."""
        path = os.path.join(self._get_step_dir(run_id, step_id), name)
        if os.path.isfile(path):
            os.remove(path)
            return True
        return False

    def cleanup_run(self, run_id: str) -> bool:
        """Delete all artifacts for a run."""
        run_dir = os.path.join(self.base_dir, run_id)
        if os.path.isdir(run_dir):
            shutil.rmtree(run_dir)
            return True
        return False


# Legacy compatibility function
def copy_artifact_from_repo(
    base_dir: str,
    repo_root: str,
    run_id: str,
    step_id: int,
    name: str,
    rel_path: str,
) -> ArtifactMeta:
    """Legacy function for backward compatibility."""
    store = ArtifactStore(base_dir, repo_root)
    return store.copy_artifact(run_id, step_id, name, rel_path)
