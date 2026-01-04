"""Parlant-style governance engine adapter.

This module implements the core Parlant concepts:
1. Guidelines as structured behavioral rules (not prompt text)
2. Task decomposition into governed steps
3. Supervision hints for retry/recovery
4. Session state management

The adapter pattern allows swapping the underlying implementation
while maintaining the same interface for the orchestrator.
"""
from __future__ import annotations

import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Callable

from .contracts import StepContract, get_agent_contract


class GuidelineCategory(str, Enum):
    """Categories for behavioral guidelines."""
    BEHAVIOR = "behavior"
    SECURITY = "security"
    QUALITY = "quality"
    CUSTOM = "custom"


@dataclass
class Guideline:
    """A structured behavioral guideline (Parlant core concept).

    Unlike prompt instructions, guidelines are:
    - Prioritized (lower number = higher priority)
    - Categorized for filtering
    - Conditionally applicable based on context
    - Enforceable by the governance engine
    """
    id: str
    category: GuidelineCategory
    name: str
    description: str
    priority: int = 100
    condition: Optional[Dict[str, Any]] = None
    is_active: bool = True

    def applies_to(self, context: Dict[str, Any]) -> bool:
        """Check if this guideline applies given the context."""
        if not self.is_active:
            return False
        if self.condition is None:
            return True

        # Simple condition matching
        for key, expected in self.condition.items():
            actual = context.get(key)
            if isinstance(expected, list):
                if actual not in expected:
                    return False
            elif actual != expected:
                return False

        return True


@dataclass
class PlanStep:
    """A step in the execution plan."""
    step_id: int
    agent: str
    goal: str
    contract: StepContract
    dependencies: List[int] = field(default_factory=list)
    context: Dict[str, Any] = field(default_factory=dict)
    parallel_group: Optional[int] = None  # Steps in same group can run in parallel


@dataclass
class ExecutionPlan:
    """Complete execution plan for a task."""
    task: str
    steps: List[PlanStep]
    guidelines: List[Guideline]
    metadata: Dict[str, Any] = field(default_factory=dict)

    def get_parallel_groups(self) -> Dict[int, List[PlanStep]]:
        """Get steps organized by parallel group."""
        groups: Dict[int, List[PlanStep]] = {}
        for step in self.steps:
            group = step.parallel_group or step.step_id
            if group not in groups:
                groups[group] = []
            groups[group].append(step)
        return groups

    def get_ready_steps(self, completed_steps: set) -> List[PlanStep]:
        """Get steps that are ready to execute (all dependencies satisfied)."""
        ready = []
        for step in self.steps:
            if step.step_id in completed_steps:
                continue
            if all(dep in completed_steps for dep in step.dependencies):
                ready.append(step)
        return ready


class GovernanceEngine(ABC):
    """Abstract base class for governance engines."""

    @abstractmethod
    def propose_plan(
        self,
        task: str,
        constraints: Dict[str, Any],
    ) -> ExecutionPlan:
        """Decompose a task into an execution plan."""
        pass

    @abstractmethod
    def get_applicable_guidelines(
        self,
        context: Dict[str, Any],
    ) -> List[Guideline]:
        """Get guidelines applicable to the current context."""
        pass

    @abstractmethod
    def generate_retry_hint(
        self,
        step_id: int,
        error: str,
        attempt: int,
        context: Dict[str, Any],
    ) -> str:
        """Generate a hint for retrying a failed step."""
        pass

    @abstractmethod
    def validate_step_transition(
        self,
        from_step: Optional[int],
        to_step: int,
        context: Dict[str, Any],
    ) -> bool:
        """Validate if transitioning to a step is allowed."""
        pass


class ParlantEngine(GovernanceEngine):
    """Parlant-style governance engine implementation.

    This is the adapter that wraps Parlant concepts and can be
    extended to use the actual Parlant library when available.

    Guidelines are loaded from:
    1. Standards package (settings.json quality_gates) - if available
    2. Default built-in guidelines as fallback
    3. Database guidelines (if db_loader provided)
    """

    # Default guidelines implementing Parlant's behavioral model (fallback)
    DEFAULT_GUIDELINES = [
        Guideline(
            id="g-behavior-001",
            category=GuidelineCategory.BEHAVIOR,
            name="contract_compliance",
            description="Always follow step contracts strictly. If validation fails, analyze the error and retry with exact compliance. Do not bloat payload with unnecessary context.",
            priority=10,
        ),
        Guideline(
            id="g-behavior-002",
            category=GuidelineCategory.BEHAVIOR,
            name="minimal_context",
            description="Keep each step focused on its specific goal. Minimize context passed between steps. Each step should be self-contained.",
            priority=20,
        ),
        Guideline(
            id="g-behavior-003",
            category=GuidelineCategory.BEHAVIOR,
            name="deterministic_changes",
            description="Prefer minimal, deterministic changes. Avoid large refactors unless explicitly requested. Small focused diffs are better than comprehensive rewrites.",
            priority=30,
        ),
        Guideline(
            id="g-quality-001",
            category=GuidelineCategory.QUALITY,
            name="test_verification",
            description="If tests are available, always run them before marking a coding step complete. A passing test suite is required for reviewer approval.",
            priority=40,
            condition={"requires_tests": True},
        ),
        Guideline(
            id="g-security-001",
            category=GuidelineCategory.SECURITY,
            name="command_safety",
            description="Never execute destructive commands (rm -rf, curl|bash, etc.). Always validate artifact paths stay within repo boundaries.",
            priority=5,
        ),
        Guideline(
            id="g-security-002",
            category=GuidelineCategory.SECURITY,
            name="secret_protection",
            description="Never include secrets, API keys, or credentials in artifacts or output. Sanitize all logs before storage.",
            priority=6,
        ),
    ]

    @classmethod
    def _load_standards_guidelines(cls) -> List[Guideline]:
        """Load guidelines from standards package if available."""
        try:
            from .standards_loader import get_standards
            standards = get_standards()
            if standards.is_available:
                return standards.guidelines
        except ImportError:
            pass
        return []

    # Task decomposition templates
    # parallel_group: steps with same group number can run concurrently
    DECOMPOSITION_TEMPLATES = {
        "default": [
            {"agent": "researcher", "goal_template": "Analyze {task} requirements and constraints", "parallel_group": 1},
            {"agent": "coder", "goal_template": "Implement changes for: {task}", "parallel_group": 2},
            {"agent": "reviewer", "goal_template": "Review and test implementation of: {task}", "parallel_group": 3},
        ],
        "simple": [
            {"agent": "coder", "goal_template": "Implement: {task}", "parallel_group": 1},
            {"agent": "reviewer", "goal_template": "Review: {task}", "parallel_group": 2},
        ],
        "research_only": [
            {"agent": "researcher", "goal_template": "Research: {task}", "parallel_group": 1},
        ],
        "complex": [
            {"agent": "planner", "goal_template": "Create detailed plan for: {task}", "parallel_group": 1},
            {"agent": "researcher", "goal_template": "Gather requirements for: {task}", "parallel_group": 2},
            {"agent": "coder", "goal_template": "Implement core changes: {task}", "parallel_group": 3},
            {"agent": "coder", "goal_template": "Implement edge cases: {task}", "parallel_group": 3},  # Parallel!
            {"agent": "reviewer", "goal_template": "Comprehensive review: {task}", "parallel_group": 4},
        ],
        # Parallel templates for multi-component tasks
        "parallel_frontend_backend": [
            {"agent": "researcher", "goal_template": "Analyze {task} requirements", "parallel_group": 1},
            {"agent": "coder", "goal_template": "Implement frontend for: {task}", "parallel_group": 2},  # Parallel!
            {"agent": "coder", "goal_template": "Implement backend for: {task}", "parallel_group": 2},   # Parallel!
            {"agent": "reviewer", "goal_template": "Integration review: {task}", "parallel_group": 3},
        ],
        "parallel_multi_service": [
            {"agent": "planner", "goal_template": "Design architecture for: {task}", "parallel_group": 1},
            {"agent": "coder", "goal_template": "Implement service A: {task}", "parallel_group": 2},  # Parallel!
            {"agent": "coder", "goal_template": "Implement service B: {task}", "parallel_group": 2},  # Parallel!
            {"agent": "coder", "goal_template": "Implement service C: {task}", "parallel_group": 2},  # Parallel!
            {"agent": "reviewer", "goal_template": "Review all services: {task}", "parallel_group": 3},
        ],
    }

    def __init__(
        self,
        guidelines: Optional[List[Guideline]] = None,
        decomposition_templates: Optional[Dict[str, List[Dict[str, str]]]] = None,
        db_guidelines_loader: Optional[Callable[[], List[Dict[str, Any]]]] = None,
        load_from_standards: bool = True,
    ):
        """Initialize the Parlant engine.

        Args:
            guidelines: Custom guidelines (defaults to standards + DEFAULT_GUIDELINES)
            decomposition_templates: Custom task decomposition templates
            db_guidelines_loader: Optional function to load guidelines from DB
            load_from_standards: Whether to load guidelines from standards package
        """
        if guidelines is not None:
            self._guidelines = guidelines
        else:
            # Load from standards package first, then add defaults
            self._guidelines = []
            if load_from_standards:
                standards_guidelines = self._load_standards_guidelines()
                self._guidelines.extend(standards_guidelines)
            # Add default guidelines (avoiding duplicates by ID)
            existing_ids = {g.id for g in self._guidelines}
            for g in self.DEFAULT_GUIDELINES:
                if g.id not in existing_ids:
                    self._guidelines.append(g)

        self._templates = decomposition_templates or self.DECOMPOSITION_TEMPLATES.copy()
        self._db_loader = db_guidelines_loader

        # Load guidelines from DB if loader provided
        if self._db_loader:
            self._load_db_guidelines()

        # Sort by priority
        self._guidelines.sort(key=lambda g: g.priority)

    def _load_db_guidelines(self) -> None:
        """Load guidelines from database."""
        try:
            db_guidelines = self._db_loader()
            for g in db_guidelines:
                guideline = Guideline(
                    id=g["guideline_id"],
                    category=GuidelineCategory(g["category"]),
                    name=g["name"],
                    description=g["description"],
                    priority=g.get("priority", 100),
                    condition=json.loads(g["condition_json"]) if g.get("condition_json") else None,
                    is_active=g.get("is_active", True),
                )
                # Update or add
                existing = next((i for i, x in enumerate(self._guidelines) if x.id == guideline.id), None)
                if existing is not None:
                    self._guidelines[existing] = guideline
                else:
                    self._guidelines.append(guideline)
        except Exception:
            pass  # Fall back to default guidelines

    def add_guideline(self, guideline: Guideline) -> None:
        """Add a new guideline."""
        self._guidelines.append(guideline)
        self._guidelines.sort(key=lambda g: g.priority)

    def remove_guideline(self, guideline_id: str) -> bool:
        """Remove a guideline by ID."""
        initial_len = len(self._guidelines)
        self._guidelines = [g for g in self._guidelines if g.id != guideline_id]
        return len(self._guidelines) < initial_len

    def get_applicable_guidelines(
        self,
        context: Dict[str, Any],
    ) -> List[Guideline]:
        """Get guidelines applicable to the current context."""
        applicable = [g for g in self._guidelines if g.applies_to(context)]
        return sorted(applicable, key=lambda g: g.priority)

    def _select_template(self, task: str, constraints: Dict[str, Any]) -> str:
        """Select the appropriate decomposition template."""
        mode = constraints.get("mode", "safe")
        complexity = constraints.get("complexity", "default")

        if complexity in self._templates:
            return complexity

        # Heuristic selection based on task
        task_lower = task.lower()
        if any(word in task_lower for word in ["research", "analyze", "find", "explore"]):
            return "research_only"
        if any(word in task_lower for word in ["refactor", "rewrite", "redesign", "migrate"]):
            return "complex"
        if mode == "fast":
            return "simple"

        return "default"

    def propose_plan(
        self,
        task: str,
        constraints: Dict[str, Any],
    ) -> ExecutionPlan:
        """Decompose a task into an execution plan.

        Supports parallel execution: steps in the same parallel_group can run
        concurrently if their dependencies are satisfied.
        """
        template_name = self._select_template(task, constraints)
        template = self._templates.get(template_name, self._templates["default"])

        steps = []
        group_first_steps: Dict[int, int] = {}  # parallel_group -> first step_id in group

        for i, item in enumerate(template, start=1):
            agent = item["agent"]
            goal = item["goal_template"].format(task=task)
            contract = get_agent_contract(agent)
            parallel_group = item.get("parallel_group", i)

            # Set up dependencies based on parallel groups
            # Steps depend on ALL steps from previous groups, not previous step_ids
            dependencies = []
            for prev_group, first_step in group_first_steps.items():
                if prev_group < parallel_group:
                    # Find all steps in the previous group
                    for s in steps:
                        if s.parallel_group == prev_group:
                            dependencies.append(s.step_id)

            # Track first step of each group for dependency resolution
            if parallel_group not in group_first_steps:
                group_first_steps[parallel_group] = i

            steps.append(PlanStep(
                step_id=i,
                agent=agent,
                goal=goal,
                contract=contract,
                dependencies=dependencies,
                parallel_group=parallel_group,
            ))

        # Get applicable guidelines
        context = {"task": task, **constraints}
        guidelines = self.get_applicable_guidelines(context)

        # Check if plan has parallel steps
        has_parallel = len(set(s.parallel_group for s in steps)) < len(steps)

        return ExecutionPlan(
            task=task,
            steps=steps,
            guidelines=guidelines,
            metadata={
                "template": template_name,
                "constraints": constraints,
                "has_parallel_steps": has_parallel,
                "parallel_groups": list(set(s.parallel_group for s in steps)),
            },
        )

    def generate_retry_hint(
        self,
        step_id: int,
        error: str,
        attempt: int,
        context: Dict[str, Any],
    ) -> str:
        """Generate a hint for retrying a failed step.

        The hint is structured to help the agent recover from the error
        while staying within governance bounds.
        """
        # Get applicable guidelines for this retry
        guidelines = self.get_applicable_guidelines(context)
        guideline_hints = [g.description for g in guidelines[:3]]  # Top 3 by priority

        # Build retry hint
        hints = [
            f"Retry step {step_id} (attempt {attempt + 1}).",
            f"Previous error: {error}",
            "",
            "Recovery instructions:",
        ]

        # Error-specific hints
        if "required field" in error.lower():
            hints.append("- Ensure all required fields are present in the output")
            hints.append("- Check the contract requirements carefully")
        elif "patch" in error.lower():
            hints.append("- Ensure you generate a .patch or .diff file")
            hints.append("- Run: git diff > ./.ai/tmp/diff.patch")
        elif "tests" in error.lower():
            hints.append("- Run the test suite and report results")
            hints.append("- Include tests.ok=true only if all tests pass")
        elif "blocked" in error.lower():
            hints.append("- Remove any blocked commands from your workflow")
            hints.append("- Use safe alternatives for file operations")
        elif "size" in error.lower():
            hints.append("- Reduce the size of artifacts")
            hints.append("- Split large patches into smaller focused changes")

        # Add governance hints
        hints.append("")
        hints.append("Governance guidelines to follow:")
        for gh in guideline_hints:
            hints.append(f"- {gh}")

        return "\n".join(hints)

    def validate_step_transition(
        self,
        from_step: Optional[int],
        to_step: int,
        context: Dict[str, Any],
    ) -> bool:
        """Validate if transitioning to a step is allowed.

        Ensures proper sequencing and dependency satisfaction.
        """
        # First step is always allowed
        if from_step is None and to_step == 1:
            return True

        # Get plan from context if available
        plan = context.get("plan")
        if not plan:
            # Without plan, only allow sequential progression
            return from_step is not None and to_step == from_step + 1

        # Check step exists
        step = next((s for s in plan.steps if s.step_id == to_step), None)
        if not step:
            return False

        # Check dependencies
        completed = context.get("completed_steps", set())
        for dep_id in step.dependencies:
            if dep_id not in completed:
                return False

        return True

    def format_guidelines_for_agent(self, context: Dict[str, Any]) -> str:
        """Format applicable guidelines as text for agent context."""
        guidelines = self.get_applicable_guidelines(context)

        if not guidelines:
            return ""

        lines = ["## Active Guidelines", ""]
        for g in guidelines:
            lines.append(f"**[{g.category.value.upper()}]** {g.name}")
            lines.append(f"  {g.description}")
            lines.append("")

        return "\n".join(lines)


# Legacy compatibility
def load_guidelines() -> List[str]:
    """Legacy function returning guidelines as strings."""
    return [g.description for g in ParlantEngine.DEFAULT_GUIDELINES]
