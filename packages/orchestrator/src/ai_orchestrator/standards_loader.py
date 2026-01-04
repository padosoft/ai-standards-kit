"""Standards loader for integrating with @padosoft/ai-standards package.

This module reads settings.json from the standards package and converts
quality gates into Parlant Guidelines for the governance engine.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from .parlant_adapter import Guideline, GuidelineCategory, GuidelineSource


def find_standards_path() -> Optional[Path]:
    """Find the path to the standards package.

    Searches in order:
    1. AI_STANDARDS_PATH environment variable
    2. Monorepo sibling (../standards from orchestrator)
    3. Common installation paths
    """
    # 1. Environment variable
    env_path = os.environ.get("AI_STANDARDS_PATH")
    if env_path:
        path = Path(env_path)
        if path.exists() and (path / "config" / "settings.json").exists():
            return path

    # 2. Monorepo sibling (packages/orchestrator -> packages/standards)
    current_file = Path(__file__)
    # Go up from ai_orchestrator/standards_loader.py to packages/
    packages_dir = current_file.parent.parent.parent.parent
    standards_path = packages_dir / "standards"
    if standards_path.exists() and (standards_path / "config" / "settings.json").exists():
        return standards_path

    # 3. Try relative to repo root
    repo_root = os.environ.get("AI_ORCH_REPO_ROOT", "")
    if repo_root:
        # Check if it's the monorepo root
        monorepo_standards = Path(repo_root) / "packages" / "standards"
        if monorepo_standards.exists():
            return monorepo_standards

        # Check if standards are in a sibling folder
        sibling_standards = Path(repo_root).parent / "ai-enterprise" / "packages" / "standards"
        if sibling_standards.exists():
            return sibling_standards

    return None


def load_settings() -> Dict[str, Any]:
    """Load settings.json from the standards package."""
    standards_path = find_standards_path()
    if not standards_path:
        return {}

    settings_file = standards_path / "config" / "settings.json"
    if not settings_file.exists():
        return {}

    try:
        with open(settings_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def _map_gate_to_category(gate_category: str) -> GuidelineCategory:
    """Map settings.json gate category to GuidelineCategory."""
    mapping = {
        "database": GuidelineCategory.QUALITY,
        "php_laravel": GuidelineCategory.QUALITY,
        "typescript_hono": GuidelineCategory.QUALITY,
        "cloudflare_workers": GuidelineCategory.QUALITY,
        "react_native": GuidelineCategory.QUALITY,
        "logging": GuidelineCategory.SECURITY,
        "testing": GuidelineCategory.QUALITY,
        "security": GuidelineCategory.SECURITY,
        "general": GuidelineCategory.BEHAVIOR,
    }
    return mapping.get(gate_category, GuidelineCategory.CUSTOM)


def _map_gate_to_condition(gate_category: str) -> Optional[Dict[str, Any]]:
    """Map gate category to a condition for filtering."""
    stack_conditions = {
        "php_laravel": {"stack": ["php-laravel", "laravel", "php"]},
        "typescript_hono": {"stack": ["ts-hono", "typescript", "hono", "ts"]},
        "cloudflare_workers": {"stack": ["cf-workers", "cloudflare", "workers"]},
        "react_native": {"stack": ["react-native", "rn", "mobile"]},
    }
    return stack_conditions.get(gate_category)


def quality_gates_to_guidelines(settings: Dict[str, Any], settings_path: Optional[Path] = None) -> List[Guideline]:
    """Convert quality_gates from settings.json to Parlant Guidelines.

    Args:
        settings: The loaded settings.json content
        settings_path: Optional path to settings.json for source tracking

    Returns:
        List of Guidelines ready for use by ParlantEngine
    """
    guidelines: List[Guideline] = []
    quality_gates = settings.get("quality_gates", {})
    source_path = str(settings_path) if settings_path else None

    # Priority assignment (lower = higher priority)
    # Security gates: 1-20
    # Database gates: 21-40
    # Stack-specific gates: 41-80
    # General gates: 81-100

    priority_base = {
        "security": 1,
        "logging": 10,
        "database": 21,
        "testing": 31,
        "php_laravel": 41,
        "typescript_hono": 51,
        "cloudflare_workers": 61,
        "react_native": 71,
        "general": 81,
    }

    for category_name, gates in quality_gates.items():
        if not isinstance(gates, dict):
            continue

        base_priority = priority_base.get(category_name, 100)
        category = _map_gate_to_category(category_name)
        condition = _map_gate_to_condition(category_name)

        for gate_idx, (gate_name, gate_config) in enumerate(gates.items()):
            if not isinstance(gate_config, dict):
                continue

            # Skip disabled gates
            if not gate_config.get("enabled", True):
                continue

            message = gate_config.get("message", f"Quality gate: {gate_name}")

            # Determine severity from message prefix
            is_blocking = message.startswith("BLOCKED:")

            guideline = Guideline(
                id=f"qg-{category_name}-{gate_name}",
                category=category,
                name=gate_name,
                description=message,
                priority=base_priority + gate_idx,
                condition=condition,
                is_active=True,
                source=GuidelineSource.STANDARDS,
                source_path=source_path,
            )
            guidelines.append(guideline)

    return guidelines


def load_denylist(settings: Dict[str, Any]) -> List[str]:
    """Load denylist patterns from settings."""
    denylist = settings.get("denylist", {})
    return denylist.get("patterns", [])


def load_auto_approve_commands(settings: Dict[str, Any]) -> List[str]:
    """Load auto-approve commands from settings."""
    auto_approve = settings.get("auto_approve_commands", {})
    if not auto_approve.get("enabled", False):
        return []
    return auto_approve.get("commands", [])


def load_debug_mode_settings(settings: Dict[str, Any]) -> Dict[str, bool]:
    """Load debug mode settings."""
    return settings.get("debug_mode", {
        "enabled": False,
        "verbose_routing": True,
        "show_stack_detection": True,
        "show_agent_selection": True,
        "show_guide_loading": True,
        "show_quality_gates": True,
        "show_execution_summary": True,
    })


class StandardsIntegration:
    """High-level integration with the standards package."""

    def __init__(self) -> None:
        self._settings: Optional[Dict[str, Any]] = None
        self._guidelines: Optional[List[Guideline]] = None
        self._standards_path: Optional[Path] = None

    @property
    def standards_path(self) -> Optional[Path]:
        """Get the path to the standards package."""
        if self._standards_path is None:
            self._standards_path = find_standards_path()
        return self._standards_path

    @property
    def settings(self) -> Dict[str, Any]:
        """Get the loaded settings."""
        if self._settings is None:
            self._settings = load_settings()
        return self._settings

    @property
    def guidelines(self) -> List[Guideline]:
        """Get quality gates converted to guidelines."""
        if self._guidelines is None:
            settings_path = None
            if self.standards_path:
                settings_path = self.standards_path / "config" / "settings.json"
            self._guidelines = quality_gates_to_guidelines(self.settings, settings_path)
        return self._guidelines

    @property
    def is_available(self) -> bool:
        """Check if standards package is available."""
        return self.standards_path is not None

    def get_agent_path(self, category: str, name: str) -> Optional[Path]:
        """Get path to an agent markdown file."""
        if not self.standards_path:
            return None
        path = self.standards_path / "agents" / category / f"{name}.md"
        return path if path.exists() else None

    def load_agent_content(self, category: str, name: str) -> Optional[str]:
        """Load an agent's markdown content."""
        path = self.get_agent_path(category, name)
        if not path:
            return None
        try:
            return path.read_text(encoding="utf-8")
        except IOError:
            return None

    def get_standard_path(self, stack: str, name: str) -> Optional[Path]:
        """Get path to a standard document."""
        if not self.standards_path:
            return None
        path = self.standards_path / "docs" / "standards" / stack / f"{name}.md"
        return path if path.exists() else None

    def load_standard_content(self, stack: str, name: str) -> Optional[str]:
        """Load a standard document's content."""
        path = self.get_standard_path(stack, name)
        if not path:
            return None
        try:
            return path.read_text(encoding="utf-8")
        except IOError:
            return None

    def get_guidelines_for_stack(self, stack: str) -> List[Guideline]:
        """Get guidelines applicable to a specific stack."""
        context = {"stack": stack}
        return [g for g in self.guidelines if g.applies_to(context)]

    def reload(self) -> None:
        """Reload settings from disk."""
        self._settings = None
        self._guidelines = None
        self._standards_path = None


# Singleton instance
_standards: Optional[StandardsIntegration] = None


def get_standards() -> StandardsIntegration:
    """Get the global standards integration instance."""
    global _standards
    if _standards is None:
        _standards = StandardsIntegration()
    return _standards
