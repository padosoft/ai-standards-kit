"""Stack detection for automatic project type identification.

Ported from the TypeScript CLI's detectStacks() function.
Detects project stacks based on presence of configuration files.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import List, Optional, Set


class Stack(str, Enum):
    """Supported development stacks."""
    PHP_LARAVEL = "php-laravel"
    TS_HONO = "ts-hono"
    CF_WORKERS = "cf-workers"
    REACT_NATIVE = "react-native"
    NODE = "node"
    PYTHON = "python"
    BASH = "bash"


@dataclass
class StackInfo:
    """Information about a detected stack."""
    stack: Stack
    confidence: float  # 0.0 to 1.0
    indicators: List[str]  # Files that indicated this stack
    primary: bool = False  # Whether this is the primary stack


class StackDetector:
    """Detects project stacks from filesystem indicators.

    Usage:
        detector = StackDetector("/path/to/project")
        stacks = detector.detect()
        primary = detector.primary_stack
    """

    # Stack detection rules: (stack, files_to_check, confidence_boost_files)
    DETECTION_RULES = [
        # PHP/Laravel
        (Stack.PHP_LARAVEL, ["composer.json"], ["artisan", "app/Http/Kernel.php"]),
        # TypeScript/Hono
        (Stack.TS_HONO, ["package.json", "tsconfig.json"], ["src/index.ts", "bun.lockb"]),
        # Cloudflare Workers
        (Stack.CF_WORKERS, ["wrangler.toml"], ["wrangler.jsonc", "worker.ts"]),
        # React Native
        (Stack.REACT_NATIVE, ["app.json"], ["ios/", "android/", "metro.config.js"]),
        # Node.js (generic)
        (Stack.NODE, ["package.json"], ["node_modules/", "package-lock.json", "yarn.lock"]),
        # Python
        (Stack.PYTHON, ["pyproject.toml"], ["setup.py", "requirements.txt", "Pipfile"]),
        # Bash/Shell
        (Stack.BASH, ["*.sh"], ["Makefile", ".bashrc"]),
    ]

    def __init__(self, project_path: str | Path) -> None:
        """Initialize the detector.

        Args:
            project_path: Path to the project root directory
        """
        self.project_path = Path(project_path)
        self._detected: Optional[List[StackInfo]] = None
        self._primary: Optional[StackInfo] = None

    def _file_exists(self, filename: str) -> bool:
        """Check if a file or directory exists in the project."""
        # Handle glob patterns
        if "*" in filename:
            import glob
            pattern = str(self.project_path / filename)
            return len(glob.glob(pattern)) > 0

        path = self.project_path / filename
        return path.exists()

    def _check_composer_for_laravel(self) -> bool:
        """Check if composer.json indicates Laravel."""
        composer_path = self.project_path / "composer.json"
        if not composer_path.exists():
            return False

        try:
            import json
            with open(composer_path, "r", encoding="utf-8") as f:
                composer = json.load(f)
                require = composer.get("require", {})
                return "laravel/framework" in require
        except (json.JSONDecodeError, IOError):
            return False

    def _check_package_for_hono(self) -> bool:
        """Check if package.json indicates Hono."""
        package_path = self.project_path / "package.json"
        if not package_path.exists():
            return False

        try:
            import json
            with open(package_path, "r", encoding="utf-8") as f:
                package = json.load(f)
                deps = package.get("dependencies", {})
                dev_deps = package.get("devDependencies", {})
                all_deps = {**deps, **dev_deps}
                return "hono" in all_deps
        except (json.JSONDecodeError, IOError):
            return False

    def _check_package_for_react_native(self) -> bool:
        """Check if package.json indicates React Native."""
        package_path = self.project_path / "package.json"
        if not package_path.exists():
            return False

        try:
            import json
            with open(package_path, "r", encoding="utf-8") as f:
                package = json.load(f)
                deps = package.get("dependencies", {})
                return "react-native" in deps
        except (json.JSONDecodeError, IOError):
            return False

    def detect(self) -> List[StackInfo]:
        """Detect all stacks present in the project.

        Returns:
            List of StackInfo objects sorted by confidence (highest first)
        """
        if self._detected is not None:
            return self._detected

        detected: List[StackInfo] = []

        for stack, required_files, boost_files in self.DETECTION_RULES:
            # Check required files
            indicators: List[str] = []
            for file in required_files:
                if self._file_exists(file):
                    indicators.append(file)

            if not indicators:
                continue

            # Calculate base confidence
            confidence = len(indicators) / len(required_files)

            # Check boost files
            boost_count = 0
            for file in boost_files:
                if self._file_exists(file):
                    indicators.append(file)
                    boost_count += 1

            # Apply boost (up to 0.3 additional)
            if boost_files:
                confidence += 0.3 * (boost_count / len(boost_files))

            # Stack-specific refinements
            if stack == Stack.PHP_LARAVEL:
                if self._check_composer_for_laravel():
                    confidence = min(1.0, confidence + 0.2)
                    indicators.append("laravel/framework in composer.json")

            elif stack == Stack.TS_HONO:
                if self._check_package_for_hono():
                    confidence = min(1.0, confidence + 0.2)
                    indicators.append("hono in package.json")

            elif stack == Stack.REACT_NATIVE:
                # Check for mobile directories
                has_ios = self._file_exists("ios/")
                has_android = self._file_exists("android/")
                if has_ios or has_android:
                    confidence = min(1.0, confidence + 0.2)
                if self._check_package_for_react_native():
                    confidence = min(1.0, confidence + 0.2)
                    indicators.append("react-native in package.json")

            elif stack == Stack.NODE:
                # Node is generic, reduce confidence if more specific stack detected
                confidence *= 0.5

            detected.append(StackInfo(
                stack=stack,
                confidence=confidence,
                indicators=indicators,
            ))

        # Sort by confidence
        detected.sort(key=lambda x: x.confidence, reverse=True)

        # Mark primary
        if detected:
            detected[0].primary = True

        self._detected = detected
        return detected

    @property
    def primary_stack(self) -> Optional[StackInfo]:
        """Get the primary (highest confidence) stack."""
        stacks = self.detect()
        return stacks[0] if stacks else None

    @property
    def stack_names(self) -> List[str]:
        """Get list of detected stack names."""
        return [s.stack.value for s in self.detect()]

    def has_stack(self, stack: Stack | str) -> bool:
        """Check if a specific stack is detected."""
        if isinstance(stack, str):
            stack_value = stack
        else:
            stack_value = stack.value

        return any(s.stack.value == stack_value for s in self.detect())

    def to_dict(self) -> dict:
        """Convert detection results to dictionary."""
        stacks = self.detect()
        primary = self.primary_stack

        return {
            "project_path": str(self.project_path),
            "stacks": [
                {
                    "name": s.stack.value,
                    "confidence": round(s.confidence, 2),
                    "indicators": s.indicators,
                    "primary": s.primary,
                }
                for s in stacks
            ],
            "primary_stack": primary.stack.value if primary else None,
        }


def detect_stacks(project_path: str | Path) -> List[str]:
    """Simple function to detect stack names.

    Compatible with the TypeScript CLI's detectStacks() signature.

    Args:
        project_path: Path to project root

    Returns:
        List of stack name strings
    """
    detector = StackDetector(project_path)
    return detector.stack_names


def detect_stacks_detailed(project_path: str | Path) -> dict:
    """Detect stacks with full details.

    Args:
        project_path: Path to project root

    Returns:
        Dictionary with detection details
    """
    detector = StackDetector(project_path)
    return detector.to_dict()
