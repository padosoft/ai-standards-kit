# Auto-Documentation Standards

## Overview
Every agent MUST automatically update project documentation after completing tasks. This is **mandatory** - never optional or user-requested.

## Documentation Automation Rules

### 1. README.md Auto-Update
**Trigger**: If `README.md` exists in project root
**Action**: ALWAYS update automatically (no user permission needed)

#### What to Update:
- **Installation**: New dependencies, setup steps, requirements
- **Usage**: New commands, API endpoints, configuration options
- **Examples**: Code samples for new features
- **API Documentation**: Schema changes, new endpoints
- **Configuration**: Environment variables, config files
- **Breaking Changes**: Incompatible changes that affect users
- **Dependencies**: New packages, version updates

#### Format Requirements:
- Maintain existing structure and styling
- Preserve user customizations  
- Add sections only when necessary
- Update existing sections rather than duplicating
- Keep examples current and working

### 2. COMPLETE_PROJECT_PROMPT.md Auto-Update
**Trigger**: If `COMPLETE_PROJECT_PROMPT.md` exists in project root
**Action**: ALWAYS update automatically (no user permission needed)

#### What to Update:
- **Implementation Progress**: Mark completed checkboxes ✅
- **Completed Phases**: Update phase status and details
- **New Requirements**: Add phases for additional features
- **Architecture Changes**: Document structural modifications
- **Quality Gates**: Update validation rules and checks
- **Technical Debt**: Document known issues and improvement areas

#### Format Requirements:
- Maintain checklist structure with `- [ ]` and `- [x]` format
- Preserve phase numbering and hierarchy
- Add implementation notes and details
- Update success criteria and KPIs
- Keep technical accuracy and completeness

## Implementation Protocol

### Execution Order (MANDATORY)
```typescript
// After completing primary task:
async function completeTask() {
  // 1. Finish primary implementation
  await completePrimaryTask();
  
  // 2. Validate quality gates
  await validateQualityGates();
  
  // 3. AUTO-UPDATE README.md (MANDATORY)
  if (exists('README.md')) {
    await updateReadme({
      changes: taskChanges,
      newFeatures: implementedFeatures,
      breaking: breakingChanges,
      dependencies: newDependencies
    });
  }
  
  // 4. AUTO-UPDATE COMPLETE_PROJECT_PROMPT.md (MANDATORY)
  if (exists('COMPLETE_PROJECT_PROMPT.md')) {
    await updateProjectPrompt({
      completedPhases: finishedPhases,
      newRequirements: additionalFeatures,
      architectureChanges: structuralChanges,
      qualityGates: updatedValidations
    });
  }
  
  // 5. Provide final summary
  return completionSummary;
}
```

### Agent Behavior Rules
1. **Never ask permission** to update documentation
2. **Never skip documentation updates** if files exist
3. **Always execute both updates** when files are present
4. **Maintain consistency** with existing structure
5. **Be comprehensive** but avoid duplication

## Quality Checks
- ✅ Documentation updates reflect all changes made
- ✅ No broken links or invalid examples
- ✅ Consistent formatting and structure
- ✅ Current timestamps and version information
- ✅ Working code examples and commands

## Error Handling
If documentation update fails:
1. Log the error details
2. Continue with task completion  
3. Report documentation update failure in summary
4. Do NOT block primary task completion

**Remember**: Documentation automation is a **quality gate** - it ensures project maintainability and team productivity.