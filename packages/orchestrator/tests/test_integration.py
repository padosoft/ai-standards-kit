"""Integration tests for AI Orchestrator with Standards package.

Tests the integration between:
1. Standards package (settings.json, agents, docs)
2. Stack detector (Python port)
3. Parlant engine with loaded guidelines
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

# Add src to path for local testing
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))


class TestStandardsIntegration:
    """Test integration with @padosoft/ai-standards package."""

    def test_find_standards_path(self):
        """Test that standards path is found in monorepo."""
        from ai_orchestrator.standards_loader import find_standards_path

        path = find_standards_path()
        # May be None if running outside monorepo
        if path is not None:
            assert path.exists()
            assert (path / "config" / "settings.json").exists()

    def test_load_settings(self):
        """Test loading settings.json."""
        from ai_orchestrator.standards_loader import load_settings, find_standards_path

        if find_standards_path() is None:
            pytest.skip("Standards package not found")

        settings = load_settings()
        assert isinstance(settings, dict)
        # Should have quality_gates section
        assert "quality_gates" in settings

    def test_quality_gates_to_guidelines(self):
        """Test converting quality gates to Parlant Guidelines."""
        from ai_orchestrator.standards_loader import (
            load_settings,
            quality_gates_to_guidelines,
            find_standards_path,
        )
        from ai_orchestrator.parlant_adapter import Guideline

        if find_standards_path() is None:
            pytest.skip("Standards package not found")

        settings = load_settings()
        guidelines = quality_gates_to_guidelines(settings)

        assert isinstance(guidelines, list)
        if guidelines:
            assert all(isinstance(g, Guideline) for g in guidelines)
            # Check that IDs follow expected pattern
            for g in guidelines:
                assert g.id.startswith("qg-")

    def test_standards_integration_singleton(self):
        """Test StandardsIntegration singleton pattern."""
        from ai_orchestrator.standards_loader import get_standards, StandardsIntegration

        s1 = get_standards()
        s2 = get_standards()
        assert s1 is s2
        assert isinstance(s1, StandardsIntegration)


class TestStackDetector:
    """Test Python stack detector."""

    def test_stack_enum(self):
        """Test Stack enum values."""
        from ai_orchestrator.stack_detector import Stack

        assert Stack.PHP_LARAVEL.value == "php-laravel"
        assert Stack.TS_HONO.value == "ts-hono"
        assert Stack.CF_WORKERS.value == "cf-workers"
        assert Stack.PYTHON.value == "python"

    def test_stack_detector_init(self, tmp_path):
        """Test StackDetector initialization."""
        from ai_orchestrator.stack_detector import StackDetector

        detector = StackDetector(tmp_path)
        assert detector.project_path == tmp_path

    def test_detect_empty_project(self, tmp_path):
        """Test detection on empty project."""
        from ai_orchestrator.stack_detector import StackDetector

        detector = StackDetector(tmp_path)
        stacks = detector.detect()
        assert stacks == []
        assert detector.primary_stack is None

    def test_detect_python_project(self, tmp_path):
        """Test detection of Python project."""
        from ai_orchestrator.stack_detector import StackDetector, Stack

        # Create pyproject.toml
        (tmp_path / "pyproject.toml").write_text("[project]\nname = 'test'")

        detector = StackDetector(tmp_path)
        stacks = detector.detect()

        assert len(stacks) >= 1
        assert detector.has_stack(Stack.PYTHON)
        assert detector.has_stack("python")

    def test_detect_node_project(self, tmp_path):
        """Test detection of Node.js project."""
        from ai_orchestrator.stack_detector import StackDetector, Stack

        # Create package.json
        (tmp_path / "package.json").write_text('{"name": "test"}')

        detector = StackDetector(tmp_path)
        stacks = detector.detect()

        assert len(stacks) >= 1
        assert detector.has_stack(Stack.NODE)

    def test_detect_laravel_project(self, tmp_path):
        """Test detection of Laravel project."""
        from ai_orchestrator.stack_detector import StackDetector, Stack
        import json

        # Create composer.json with Laravel
        composer = {
            "require": {
                "laravel/framework": "^10.0"
            }
        }
        (tmp_path / "composer.json").write_text(json.dumps(composer))

        detector = StackDetector(tmp_path)
        stacks = detector.detect()

        assert len(stacks) >= 1
        primary = detector.primary_stack
        assert primary is not None
        assert primary.stack == Stack.PHP_LARAVEL

    def test_detect_hono_project(self, tmp_path):
        """Test detection of Hono project."""
        from ai_orchestrator.stack_detector import StackDetector, Stack
        import json

        # Create package.json with Hono + tsconfig
        package = {
            "name": "test",
            "dependencies": {
                "hono": "^4.0.0"
            }
        }
        (tmp_path / "package.json").write_text(json.dumps(package))
        (tmp_path / "tsconfig.json").write_text('{}')

        detector = StackDetector(tmp_path)
        stacks = detector.detect()

        assert detector.has_stack(Stack.TS_HONO)

    def test_detect_cloudflare_workers(self, tmp_path):
        """Test detection of Cloudflare Workers project."""
        from ai_orchestrator.stack_detector import StackDetector, Stack

        # Create wrangler.toml
        (tmp_path / "wrangler.toml").write_text('name = "my-worker"')

        detector = StackDetector(tmp_path)
        stacks = detector.detect()

        assert detector.has_stack(Stack.CF_WORKERS)

    def test_to_dict(self, tmp_path):
        """Test conversion to dictionary."""
        from ai_orchestrator.stack_detector import StackDetector
        import json

        (tmp_path / "pyproject.toml").write_text("[project]")

        detector = StackDetector(tmp_path)
        result = detector.to_dict()

        assert "project_path" in result
        assert "stacks" in result
        assert "primary_stack" in result
        assert isinstance(result["stacks"], list)

    def test_detect_stacks_function(self, tmp_path):
        """Test the simple detect_stacks() function."""
        from ai_orchestrator.stack_detector import detect_stacks

        (tmp_path / "pyproject.toml").write_text("[project]")

        stacks = detect_stacks(tmp_path)
        assert isinstance(stacks, list)
        assert "python" in stacks

    def test_stack_names_property(self, tmp_path):
        """Test stack_names property."""
        from ai_orchestrator.stack_detector import StackDetector

        (tmp_path / "pyproject.toml").write_text("[project]")

        detector = StackDetector(tmp_path)
        names = detector.stack_names

        assert isinstance(names, list)
        assert "python" in names


class TestParlantEngineIntegration:
    """Test ParlantEngine integration with standards."""

    def test_engine_loads_standards_guidelines(self):
        """Test that ParlantEngine loads guidelines from standards."""
        from ai_orchestrator.parlant_adapter import ParlantEngine
        from ai_orchestrator.standards_loader import find_standards_path

        engine = ParlantEngine(load_from_standards=True)

        # Should always have at least default guidelines
        assert len(engine._guidelines) >= len(ParlantEngine.DEFAULT_GUIDELINES)

        # If standards available, should have more
        if find_standards_path() is not None:
            # Check for quality gate guidelines
            qg_guidelines = [g for g in engine._guidelines if g.id.startswith("qg-")]
            # May have quality gate guidelines if settings.json has them
            print(f"Found {len(qg_guidelines)} quality gate guidelines")

    def test_engine_without_standards(self):
        """Test ParlantEngine without loading from standards."""
        from ai_orchestrator.parlant_adapter import ParlantEngine

        engine = ParlantEngine(load_from_standards=False)

        # Should only have default guidelines
        assert len(engine._guidelines) == len(ParlantEngine.DEFAULT_GUIDELINES)

    def test_guidelines_sorted_by_priority(self):
        """Test that guidelines are sorted by priority."""
        from ai_orchestrator.parlant_adapter import ParlantEngine

        engine = ParlantEngine()

        priorities = [g.priority for g in engine._guidelines]
        assert priorities == sorted(priorities)

    def test_get_guidelines_for_stack(self):
        """Test getting guidelines filtered by stack."""
        from ai_orchestrator.standards_loader import get_standards, find_standards_path

        if find_standards_path() is None:
            pytest.skip("Standards package not found")

        standards = get_standards()
        laravel_guidelines = standards.get_guidelines_for_stack("php-laravel")

        # Should return a list (may be empty if no stack-specific gates)
        assert isinstance(laravel_guidelines, list)


class TestMCPToolsIntegration:
    """Test MCP tools work with integrated standards."""

    def test_get_guidelines_context(self):
        """Test get_guidelines with context including stack."""
        from ai_orchestrator.parlant_adapter import ParlantEngine

        engine = ParlantEngine()

        # Get guidelines for Laravel context
        context = {"stack": "php-laravel", "task_type": "api"}
        guidelines = engine.get_applicable_guidelines(context)

        assert isinstance(guidelines, list)
        # All returned guidelines should apply to this context
        for g in guidelines:
            assert g.applies_to(context)

    def test_format_guidelines_for_agent(self):
        """Test formatting guidelines for agent context."""
        from ai_orchestrator.parlant_adapter import ParlantEngine

        engine = ParlantEngine()
        context = {"stack": "python"}

        formatted = engine.format_guidelines_for_agent(context)

        assert isinstance(formatted, str)
        if formatted:
            assert "Active Guidelines" in formatted


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
