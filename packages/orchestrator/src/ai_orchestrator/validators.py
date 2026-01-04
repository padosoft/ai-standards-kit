"""Validation logic for contracts, outputs, and security policies."""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Tuple, Optional, List, Dict, Any

from .contracts import StepContract, StepOutput, ContractSeverity, TestResult


@dataclass
class ValidationResult:
    """Result of a validation operation."""
    valid: bool
    error: Optional[str] = None
    warnings: List[str] = None
    details: Dict[str, Any] = None

    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []
        if self.details is None:
            self.details = {}


class SecurityValidator:
    """Validates security policies for commands and paths."""

    # Default blocked command patterns
    DEFAULT_BLOCKED_PATTERNS = [
        r"rm\s+-rf\s+/",
        r"rm\s+-r\s+/",
        r"curl.*\|\s*(ba)?sh",
        r"wget.*\|\s*(ba)?sh",
        r"dd\s+if=",
        r">\s*/dev/",
        r"mkfs\.",
        r":\(\)\s*\{\s*:\|:&\s*\}\s*;:",  # Fork bomb
        r"chmod\s+-R\s+777",
        r"sudo\s+rm",
        r"sudo\s+dd",
        r"eval\s*\$",
        r"\$\(.*rm\s",
        r"`.*rm\s",
    ]

    def __init__(
        self,
        blocked_patterns: Optional[List[str]] = None,
        allowed_path_prefixes: Optional[List[str]] = None,
        blocked_path_patterns: Optional[List[str]] = None,
    ):
        self.blocked_patterns = [
            re.compile(p, re.IGNORECASE)
            for p in (blocked_patterns or self.DEFAULT_BLOCKED_PATTERNS)
        ]
        self.allowed_path_prefixes = allowed_path_prefixes or ["./.ai/tmp/", "./src/", "./tests/"]
        self.blocked_path_patterns = blocked_path_patterns or ["../"]

    def validate_command(self, command: str) -> ValidationResult:
        """Check if a command is allowed."""
        for pattern in self.blocked_patterns:
            if pattern.search(command):
                return ValidationResult(
                    valid=False,
                    error=f"Blocked command pattern detected: {pattern.pattern}",
                    details={"command": command, "matched_pattern": pattern.pattern}
                )
        return ValidationResult(valid=True)

    def validate_commands(self, commands: List[str]) -> ValidationResult:
        """Check if all commands are allowed."""
        for cmd in commands:
            result = self.validate_command(cmd)
            if not result.valid:
                return result
        return ValidationResult(valid=True)

    def validate_path(self, path: str) -> ValidationResult:
        """Check if a path is allowed."""
        # Check for blocked patterns
        for pattern in self.blocked_path_patterns:
            if pattern in path:
                return ValidationResult(
                    valid=False,
                    error=f"Blocked path pattern: {pattern}",
                    details={"path": path, "blocked_pattern": pattern}
                )

        # Check if path starts with allowed prefix
        normalized = path.replace("\\", "/")
        if not normalized.startswith("./"):
            normalized = "./" + normalized

        for prefix in self.allowed_path_prefixes:
            if normalized.startswith(prefix):
                return ValidationResult(valid=True)

        return ValidationResult(
            valid=False,
            error=f"Path not in allowed prefixes: {path}",
            details={"path": path, "allowed_prefixes": self.allowed_path_prefixes}
        )


class ArtifactValidator:
    """Validates artifact sizes and content."""

    def __init__(
        self,
        max_patch_bytes: int = 2 * 1024 * 1024,
        max_log_bytes: int = 1 * 1024 * 1024,
        max_total_bytes: int = 10 * 1024 * 1024,
    ):
        self.max_patch_bytes = max_patch_bytes
        self.max_log_bytes = max_log_bytes
        self.max_total_bytes = max_total_bytes

    def validate_size(self, name: str, size_bytes: int) -> ValidationResult:
        """Validate artifact size based on type."""
        lower = name.lower()

        if lower.endswith((".patch", ".diff")):
            if size_bytes > self.max_patch_bytes:
                return ValidationResult(
                    valid=False,
                    error=f"Patch too large: {size_bytes} bytes (max: {self.max_patch_bytes})",
                    details={"name": name, "size": size_bytes, "max": self.max_patch_bytes}
                )
        elif lower.endswith(".log"):
            if size_bytes > self.max_log_bytes:
                return ValidationResult(
                    valid=False,
                    error=f"Log too large: {size_bytes} bytes (max: {self.max_log_bytes})",
                    details={"name": name, "size": size_bytes, "max": self.max_log_bytes}
                )

        return ValidationResult(valid=True)

    def validate_total_size(self, artifacts: List[Tuple[str, int]]) -> ValidationResult:
        """Validate total size of all artifacts."""
        total = sum(size for _, size in artifacts)
        if total > self.max_total_bytes:
            return ValidationResult(
                valid=False,
                error=f"Total artifacts too large: {total} bytes (max: {self.max_total_bytes})",
                details={"total_size": total, "max": self.max_total_bytes}
            )
        return ValidationResult(valid=True)


def validate_output(contract: StepContract, output: StepOutput) -> Tuple[bool, Optional[str]]:
    """Validate step output against contract.

    Returns (is_valid, error_message).
    """
    # Check required fields
    for key in contract.must_have:
        val = getattr(output, key, None)
        if val in (None, "", []):
            return False, f"Missing required field: {key}"

    # Check patch requirement
    if contract.requires_patch:
        has_patch = any(
            a.endswith((".patch", ".diff"))
            for a in output.artifacts
        )
        if not has_patch:
            return False, "Patch required but no .patch/.diff artifact declared in artifacts[]"

    # Check tests requirement
    if contract.requires_tests:
        if output.tests is None:
            return False, "Tests required but tests field is missing"
        if not output.tests.ok:
            return False, f"Tests required but tests failed: {output.tests.log[:200] if output.tests.log else 'no log'}"

    return True, None


def validate_output_full(
    contract: StepContract,
    output: StepOutput,
    security_validator: Optional[SecurityValidator] = None,
) -> ValidationResult:
    """Full validation of step output including security checks.

    Returns detailed ValidationResult.
    """
    warnings = []
    details = {}

    # Basic contract validation
    is_valid, error = validate_output(contract, output)
    if not is_valid:
        return ValidationResult(valid=False, error=error)

    # Security validation for commands
    if security_validator and output.commands_run:
        cmd_result = security_validator.validate_commands(output.commands_run)
        if not cmd_result.valid:
            if contract.severity == ContractSeverity.STRICT:
                return cmd_result
            else:
                warnings.append(f"Security warning: {cmd_result.error}")

    # Path validation
    if security_validator and output.artifact_paths:
        for name, path in output.artifact_paths.items():
            path_result = security_validator.validate_path(path)
            if not path_result.valid:
                if contract.severity == ContractSeverity.STRICT:
                    return path_result
                else:
                    warnings.append(f"Path warning for {name}: {path_result.error}")

    # Collect metrics
    details["artifact_count"] = len(output.artifacts)
    details["commands_count"] = len(output.commands_run)
    if output.tests:
        details["tests"] = {
            "passed": output.tests.passed,
            "failed": output.tests.failed,
            "skipped": output.tests.skipped,
        }

    return ValidationResult(
        valid=True,
        warnings=warnings,
        details=details
    )


def validate_dependencies(
    step_id: int,
    contract: StepContract,
    completed_steps: Dict[int, bool],
) -> ValidationResult:
    """Check if all dependencies are satisfied."""
    missing = []
    for dep_id in contract.dependencies:
        if dep_id not in completed_steps or not completed_steps[dep_id]:
            missing.append(dep_id)

    if missing:
        return ValidationResult(
            valid=False,
            error=f"Missing dependencies for step {step_id}: {missing}",
            details={"step_id": step_id, "missing_deps": missing}
        )

    return ValidationResult(valid=True)


def validate_required_artifacts(
    step_id: int,
    contract: StepContract,
    available_artifacts: Dict[int, List[str]],
) -> ValidationResult:
    """Check if required artifacts from previous steps are available."""
    missing = []

    for from_step, required in contract.required_artifacts_from.items():
        available = available_artifacts.get(from_step, [])
        for artifact in required:
            if artifact not in available:
                missing.append((from_step, artifact))

    if missing:
        return ValidationResult(
            valid=False,
            error=f"Missing required artifacts for step {step_id}: {missing}",
            details={"step_id": step_id, "missing_artifacts": missing}
        )

    return ValidationResult(valid=True)
