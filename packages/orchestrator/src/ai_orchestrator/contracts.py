"""Step contracts and output schemas with enhanced validation."""
from __future__ import annotations

from enum import Enum
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any


class ContractSeverity(str, Enum):
    """How strictly to enforce contract violations."""
    STRICT = "strict"      # Reject immediately on violation
    WARNING = "warning"    # Accept but log warning
    LENIENT = "lenient"    # Accept with minimal logging


class StepContract(BaseModel):
    """Contract enforced by the orchestrator *outside* the LLM.

    Contracts define what a step MUST produce to be accepted.
    This is the core of Parlant-style governance: explicit, enforceable requirements.
    """

    must_have: List[str] = Field(
        default_factory=lambda: ["summary"],
        description="Required fields in output payload"
    )
    requires_patch: bool = Field(
        default=False,
        description="Step must produce a .patch or .diff artifact"
    )
    requires_tests: bool = Field(
        default=False,
        description="Step must run tests and report results"
    )
    max_retries: int = Field(
        default=3,
        ge=0,
        le=10,
        description="Maximum retry attempts for this step"
    )
    timeout_seconds: int = Field(
        default=300,
        ge=30,
        le=3600,
        description="Maximum execution time in seconds"
    )
    severity: ContractSeverity = Field(
        default=ContractSeverity.STRICT,
        description="How strictly to enforce violations"
    )
    dependencies: List[int] = Field(
        default_factory=list,
        description="Step IDs that must complete before this step"
    )
    required_artifacts_from: Dict[int, List[str]] = Field(
        default_factory=dict,
        description="Artifacts required from previous steps: {step_id: [artifact_names]}"
    )
    custom_rules: List[str] = Field(
        default_factory=list,
        description="Additional validation rules (evaluated as expressions)"
    )


class TestResult(BaseModel):
    """Structured test execution result."""
    command: str = Field(..., description="Test command executed")
    ok: bool = Field(..., description="Whether tests passed")
    exit_code: int = Field(default=0, description="Process exit code")
    log: str = Field(default="", description="Test output (truncated if needed)")
    duration_seconds: float = Field(default=0.0, ge=0, description="Execution time")
    passed: int = Field(default=0, ge=0, description="Number of passed tests")
    failed: int = Field(default=0, ge=0, description="Number of failed tests")
    skipped: int = Field(default=0, ge=0, description="Number of skipped tests")


class StepOutput(BaseModel):
    """Payload produced by sub-agents and sent back via commit_step().

    Artifacts are expected to be generated as real files in the repo and
    referenced via artifact_paths. The orchestrator will safely resolve and
    copy them into a run folder, compute sha256, and store metadata in MySQL.
    """

    summary: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Concise summary of what was done"
    )
    details: Optional[str] = Field(
        default=None,
        max_length=10000,
        description="Extended details, notes, or explanations"
    )
    artifacts: List[str] = Field(
        default_factory=list,
        description="List of artifact names produced"
    )
    artifact_paths: Optional[Dict[str, str]] = Field(
        default=None,
        description="Mapping of artifact name to repo-relative path"
    )
    commands_run: List[str] = Field(
        default_factory=list,
        description="Commands executed during this step"
    )
    tests: Optional[TestResult] = Field(
        default=None,
        description="Test execution results if tests were run"
    )
    metrics: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional metrics (lines changed, files touched, etc.)"
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Non-fatal warnings encountered"
    )

    @field_validator("commands_run")
    @classmethod
    def sanitize_commands(cls, v: List[str]) -> List[str]:
        """Remove potentially sensitive info from command logs."""
        sanitized = []
        for cmd in v:
            # Basic sanitization - remove common secret patterns
            import re
            cleaned = re.sub(
                r'(password|passwd|secret|token|key|api_key)=[^\s]+',
                r'\1=***',
                cmd,
                flags=re.IGNORECASE
            )
            sanitized.append(cleaned)
        return sanitized


class AgentCapability(str, Enum):
    """Capabilities that agents can have."""
    READ_FILES = "read_files"
    WRITE_FILES = "write_files"
    RUN_COMMANDS = "run_commands"
    RUN_TESTS = "run_tests"
    GENERATE_PATCH = "generate_patch"
    SEARCH_CODE = "search_code"
    ANALYZE_CODE = "analyze_code"
    ANALYZE_REQUIREMENTS = "analyze_requirements"


class AgentConfig(BaseModel):
    """Configuration for a sub-agent."""

    name: str = Field(..., min_length=1, max_length=40)
    display_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    default_contract: StepContract = Field(default_factory=StepContract)
    capabilities: List[AgentCapability] = Field(default_factory=list)
    max_retries: int = Field(default=3, ge=0, le=10)
    timeout_seconds: int = Field(default=300, ge=30, le=3600)
    is_active: bool = True


# Pre-defined agent configurations
DEFAULT_AGENTS: Dict[str, AgentConfig] = {
    "researcher": AgentConfig(
        name="researcher",
        display_name="Researcher",
        description="Analyzes repo structure, docs, and code to extract constraints and facts",
        default_contract=StepContract(
            must_have=["summary"],
            requires_patch=False,
            requires_tests=False,
            timeout_seconds=180,
        ),
        capabilities=[
            AgentCapability.READ_FILES,
            AgentCapability.SEARCH_CODE,
            AgentCapability.ANALYZE_CODE,
        ],
        timeout_seconds=180,
    ),
    "coder": AgentConfig(
        name="coder",
        display_name="Coder",
        description="Implements minimal correct changes and produces patch files",
        default_contract=StepContract(
            must_have=["summary"],
            requires_patch=True,
            requires_tests=False,
            timeout_seconds=300,
        ),
        capabilities=[
            AgentCapability.READ_FILES,
            AgentCapability.WRITE_FILES,
            AgentCapability.RUN_COMMANDS,
            AgentCapability.GENERATE_PATCH,
        ],
        timeout_seconds=300,
    ),
    "reviewer": AgentConfig(
        name="reviewer",
        display_name="Reviewer",
        description="Reviews changes, runs tests, validates correctness",
        default_contract=StepContract(
            must_have=["summary"],
            requires_patch=False,
            requires_tests=True,
            timeout_seconds=600,
            max_retries=2,
        ),
        capabilities=[
            AgentCapability.READ_FILES,
            AgentCapability.RUN_TESTS,
            AgentCapability.ANALYZE_CODE,
        ],
        max_retries=2,
        timeout_seconds=600,
    ),
    "planner": AgentConfig(
        name="planner",
        display_name="Planner",
        description="Decomposes complex tasks into actionable steps",
        default_contract=StepContract(
            must_have=["summary"],
            requires_patch=False,
            requires_tests=False,
            timeout_seconds=120,
            max_retries=2,
        ),
        capabilities=[
            AgentCapability.READ_FILES,
            AgentCapability.ANALYZE_REQUIREMENTS,
        ],
        max_retries=2,
        timeout_seconds=120,
    ),
}


def get_agent_contract(agent: str) -> StepContract:
    """Get the default contract for an agent."""
    if agent in DEFAULT_AGENTS:
        return DEFAULT_AGENTS[agent].default_contract
    return StepContract(must_have=["summary"])


def get_agent_config(agent: str) -> Optional[AgentConfig]:
    """Get agent configuration by name."""
    return DEFAULT_AGENTS.get(agent)
