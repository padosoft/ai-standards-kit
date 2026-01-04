# Enterprise Quality Gates

## Quality Gate Definition

Quality gates are **mandatory checkpoints** that code must pass before promotion to the next stage. Violations result in **automatic blocking** of merges, deploys, or releases.

## Gate Enforcement Levels

### 🔴 BLOCKER (P0)
**Action**: Immediate block, no exceptions
**Examples**: Security vulnerabilities, data loss risks, broken builds

### 🟠 CRITICAL (P1)
**Action**: Block merge, require review for override
**Examples**: Missing tests, performance regressions, accessibility violations

### 🟡 MAJOR (P2)
**Action**: Warning, block after grace period
**Examples**: Code smells, documentation gaps, deprecated usage

### 🟢 MINOR (P3)
**Action**: Informational, track for improvement
**Examples**: Style violations, optimization opportunities

## Code Quality Gates

### Test Coverage Requirements
```yaml
Coverage Thresholds:
  Overall:
    minimum: 80%
    target: 90%
    blocker_if_below: 70%
  
  New Code:
    minimum: 90%
    target: 95%
    blocker_if_below: 80%
  
  Critical Paths:
    minimum: 95%
    target: 100%
    blocker_if_below: 90%

Excluded From Coverage:
  - Configuration files
  - Database migrations
  - Generated code
  - Third-party integrations (with mocks)
```

### Test Quality Metrics
```typescript
export const TestQualityGates = {
  // 🔴 BLOCKER: Tests must exist
  testsMustExist: (changes: FileChange[]): boolean => {
    const hasCode = changes.some(c => 
      c.path.match(/\.(ts|js|php|py)$/) && 
      !c.path.includes('.test.') &&
      !c.path.includes('.spec.')
    );
    
    const hasTests = changes.some(c =>
      c.path.match(/\.(test|spec)\.(ts|js|php|py)$/)
    );
    
    return !hasCode || hasTests;
  },
  
  // 🔴 BLOCKER: No skipped tests in production
  noSkippedTests: (testResults: TestResults): boolean => {
    return testResults.skipped === 0;
  },
  
  // 🟠 CRITICAL: Test execution time
  testPerformance: (testResults: TestResults): boolean => {
    return testResults.duration < 300000; // 5 minutes max
  },
  
  // 🟠 CRITICAL: Flaky test detection
  noFlakyTests: (testHistory: TestRun[]): boolean => {
    const flakyTests = testHistory.filter(run => {
      const passRate = run.passed / run.total;
      return passRate > 0.5 && passRate < 0.95;
    });
    
    return flakyTests.length === 0;
  }
};
```

### Code Complexity Limits
```typescript
export const ComplexityGates = {
  // 🔴 BLOCKER: Cyclomatic complexity
  cyclomaticComplexity: {
    method: 10,      // Max per method
    class: 50,       // Max per class
    file: 100,       // Max per file
  },
  
  // 🔴 BLOCKER: Cognitive complexity
  cognitiveComplexity: {
    method: 15,
    class: 100,
    file: 200,
  },
  
  // 🟠 CRITICAL: Lines of code
  linesOfCode: {
    method: 50,      // Excluding comments
    class: 500,
    file: 1000,
  },
  
  // 🟠 CRITICAL: Nesting depth
  nestingDepth: {
    maximum: 4,      // Max nesting levels
  },
  
  // 🟡 MAJOR: Parameter count
  parameterCount: {
    method: 5,       // Use objects for more
    constructor: 7,
  }
};
```

## Security Gates

### Vulnerability Scanning
```yaml
Security Scanning:
  🔴 BLOCKER:
    - SQL Injection vulnerabilities
    - XSS vulnerabilities
    - Authentication bypass
    - Hardcoded secrets
    - Cryptographic weaknesses
    - Path traversal risks
    
  🟠 CRITICAL:
    - Outdated dependencies with CVEs
    - Missing security headers
    - Weak password policies
    - Missing rate limiting
    - Insufficient logging
    
  🟡 MAJOR:
    - Missing CSRF protection
    - Verbose error messages
    - Missing input validation
    - Insecure randomness
```

### Dependency Security
```typescript
export const DependencyGates = {
  // 🔴 BLOCKER: No critical vulnerabilities
  noCriticalVulnerabilities: async (): Promise<boolean> => {
    const audit = await runSecurityAudit();
    return audit.critical === 0;
  },
  
  // 🔴 BLOCKER: No GPL licenses in proprietary code
  licenseCompliance: async (): Promise<boolean> => {
    const licenses = await checkLicenses();
    const prohibited = ['GPL', 'AGPL', 'LGPL'];
    
    return !licenses.some(l => 
      prohibited.includes(l.license) && l.type === 'production'
    );
  },
  
  // 🟠 CRITICAL: Dependencies up to date
  dependencyFreshness: async (): Promise<boolean> => {
    const outdated = await checkOutdated();
    
    return outdated.filter(d => {
      const ageDays = daysSinceRelease(d.latest);
      return d.type === 'production' && ageDays > 365;
    }).length === 0;
  }
};
```

## Performance Gates

### Response Time Limits
```yaml
API Performance:
  🔴 BLOCKER:
    - p99 > 5 seconds
    - p95 > 2 seconds
    - Error rate > 5%
    
  🟠 CRITICAL:
    - p99 > 1 second
    - p95 > 500ms
    - Error rate > 1%
    
  🟡 MAJOR:
    - p99 > 500ms
    - p95 > 200ms
    - Error rate > 0.1%
```

### Database Performance
```typescript
export const DatabaseGates = {
  // 🔴 BLOCKER: No table scans on large tables
  noTableScans: async (query: string): Promise<boolean> => {
    const explain = await explainQuery(query);
    const largeTableScan = explain.some(step =>
      step.type === 'SCAN' && step.rows > 10000
    );
    
    return !largeTableScan;
  },
  
  // 🔴 BLOCKER: No missing indexes on foreign keys
  foreignKeyIndexes: async (): Promise<boolean> => {
    const missingIndexes = await checkMissingIndexes();
    return missingIndexes.foreignKeys.length === 0;
  },
  
  // 🟠 CRITICAL: Query execution time
  queryPerformance: async (query: string): Promise<boolean> => {
    const stats = await analyzeQuery(query);
    return stats.executionTime < 100; // 100ms max
  },
  
  // 🟠 CRITICAL: No N+1 queries
  noNPlusOne: (queries: Query[]): boolean => {
    const patterns = detectNPlusOnePatterns(queries);
    return patterns.length === 0;
  }
};
```

### Memory and Resource Usage
```yaml
Resource Limits:
  🔴 BLOCKER:
    - Memory leak detected
    - Infinite loop detected
    - Unbounded recursion
    
  🟠 CRITICAL:
    - Memory usage > 1GB
    - CPU usage > 80% sustained
    - Thread count > 100
    
  🟡 MAJOR:
    - Memory growth > 10MB/hour
    - File handles > 1000
    - Database connections > 50
```

## Code Style Gates

### Mandatory Patterns
```typescript
export const PatternGates = {
  // 🔴 BLOCKER: Type safety
  typeScriptStrict: {
    noImplicitAny: true,
    strictNullChecks: true,
    strictFunctionTypes: true,
    strictBindCallApply: true,
    strictPropertyInitialization: true,
    noImplicitThis: true,
    alwaysStrict: true,
  },
  
  // 🔴 BLOCKER: Error handling
  errorHandling: {
    noCatchWithoutLog: true,
    noEmptyCatch: true,
    noSilentFail: true,
    requireErrorTypes: true,
  },
  
  // 🟠 CRITICAL: Async patterns
  asyncPatterns: {
    noCallbackHell: true,
    preferAsyncAwait: true,
    handleRejections: true,
    noFloatingPromises: true,
  },
  
  // 🟠 CRITICAL: Immutability
  immutability: {
    noMutation: true,
    preferConst: true,
    readonlyProperties: true,
    noDelete: true,
  }
};
```

### Anti-Pattern Detection
```yaml
Prohibited Patterns:
  🔴 BLOCKER:
    - eval() or Function() constructor
    - document.write()
    - innerHTML without sanitization
    - Direct database queries in controllers
    - Synchronous file I/O in request handlers
    - process.exit() in libraries
    
  🟠 CRITICAL:
    - console.log() in production code
    - TODO without issue reference
    - Commented-out code
    - Dead code (unreachable)
    - Duplicate code blocks > 50 lines
    
  🟡 MAJOR:
    - Magic numbers without constants
    - Deep nesting (> 4 levels)
    - Long parameter lists (> 5)
    - God objects (> 20 methods)
```

## Documentation Gates

### Code Documentation Requirements
```typescript
export const DocumentationGates = {
  // 🟠 CRITICAL: Public API documentation
  publicApiDocs: (api: APIDefinition): boolean => {
    return api.endpoints.every(endpoint => {
      return (
        endpoint.description &&
        endpoint.parameters?.every(p => p.description) &&
        endpoint.responses?.every(r => r.description) &&
        endpoint.examples?.length > 0
      );
    });
  },
  
  // 🟠 CRITICAL: Complex function documentation
  complexFunctionDocs: (func: FunctionDefinition): boolean => {
    if (func.cyclomaticComplexity > 5) {
      return (
        func.description &&
        func.parameters?.every(p => p.description) &&
        func.returns?.description &&
        func.examples?.length > 0
      );
    }
    return true;
  },
  
  // 🟡 MAJOR: README completeness
  readmeCompleteness: (readme: string): boolean => {
    const requiredSections = [
      '# Installation',
      '# Usage',
      '# Configuration',
      '# Testing',
      '# Contributing',
    ];
    
    return requiredSections.every(section =>
      readme.includes(section)
    );
  }
};
```

## Architecture Gates

### Dependency Rules
```yaml
Layer Dependencies:
  🔴 BLOCKER:
    - Presentation → Domain (skip Application)
    - Domain → Infrastructure
    - Domain → Presentation
    - Circular dependencies
    
  🟠 CRITICAL:
    - Application → Presentation
    - Infrastructure → Application
    - Cross-module direct access
    
  🟡 MAJOR:
    - Missing interface definitions
    - Concrete class injection
    - Static service calls
```

### API Design Standards
```typescript
export const APIGates = {
  // 🔴 BLOCKER: RESTful standards
  restCompliance: {
    useHttpMethods: true,      // GET, POST, PUT, DELETE
    statusCodes: true,         // Correct HTTP status codes
    resourceNaming: true,      // Plural nouns for resources
    noVerbsInUrls: true,      // /users not /getUsers
    versionInUrl: true,        // /api/v1/...
  },
  
  // 🟠 CRITICAL: Response format
  responseFormat: {
    consistentStructure: true,  // Same format across endpoints
    errorFormat: true,          // Standardized error responses
    pagination: true,           // Consistent pagination
    filtering: true,            // Standard query parameters
  },
  
  // 🟠 CRITICAL: Security
  apiSecurity: {
    authentication: true,       // All endpoints authenticated
    rateLimiting: true,        // Rate limits defined
    cors: true,                // CORS properly configured
    validation: true,          // Input validation on all endpoints
  }
};
```

## Database Gates

### Migration Standards
```yaml
Migration Requirements:
  🔴 BLOCKER:
    - No DROP commands without backup
    - No TRUNCATE in production migrations
    - No irreversible migrations without approval
    - No direct production database modifications
    
  🟠 CRITICAL:
    - Missing rollback scripts
    - No index on foreign keys
    - Missing NOT NULL on required fields
    - No default values for new columns
    
  🟡 MAJOR:
    - Missing migration tests
    - No performance impact assessment
    - Missing index analysis
```

### Query Standards
```typescript
export const QueryGates = {
  // 🔴 BLOCKER: SQL injection prevention
  noRawQueries: (code: string): boolean => {
    const patterns = [
      /query\s*\(\s*['"`].*\$\{.*\}/,  // Template literals in query
      /query\s*\(\s*['"`].*\+/,        // String concatenation
      /exec\s*\(\s*['"`].*\$\{.*\}/,   // Dynamic exec
    ];
    
    return !patterns.some(p => p.test(code));
  },
  
  // 🔴 BLOCKER: Performance killers
  performanceKillers: {
    noSelectStar: true,         // No SELECT *
    noDeepOffset: true,         // OFFSET < 1000
    noUnindexedWhere: true,     // WHERE columns must be indexed
    noFunctionInWhere: true,    // No functions in WHERE clause
  },
  
  // 🟠 CRITICAL: Best practices
  bestPractices: {
    useParameterized: true,     // Parameterized queries
    limitResults: true,         // Always use LIMIT
    useTransactions: true,      // Wrap multiple operations
    handleDeadlocks: true,      // Retry logic for deadlocks
  }
};
```

## CI/CD Gates

### Build Pipeline Gates
```yaml
Build Requirements:
  🔴 BLOCKER:
    - Build failure
    - Unit test failure
    - Security scan failure
    - Linting errors
    
  🟠 CRITICAL:
    - Integration test failure
    - Coverage decrease > 5%
    - Performance test failure
    - Documentation build failure
    
  🟡 MAJOR:
    - Warning count increase
    - TODO count increase
    - Deprecation usage
```

### Deployment Gates
```typescript
export const DeploymentGates = {
  // 🔴 BLOCKER: Pre-deployment checks
  preDeployment: {
    allTestsPassed: true,
    securityScanPassed: true,
    performanceTestPassed: true,
    migrationsTested: true,
    rollbackTested: true,
  },
  
  // 🔴 BLOCKER: Health checks
  healthChecks: {
    apiResponding: true,
    databaseConnected: true,
    cacheConnected: true,
    queuesProcessing: true,
    diskSpaceAvailable: true,
  },
  
  // 🟠 CRITICAL: Monitoring
  monitoring: {
    alertsConfigured: true,
    logsFlowing: true,
    metricsCollecting: true,
    tracingEnabled: true,
  }
};
```

## Quality Gate Automation

### Gate Configuration
```typescript
export class QualityGateEngine {
  private gates: Map<string, QualityGate> = new Map();
  
  registerGate(gate: QualityGate): void {
    this.gates.set(gate.name, gate);
  }
  
  async evaluate(context: EvaluationContext): Promise<GateResult> {
    const results: GateCheckResult[] = [];
    
    for (const [name, gate] of this.gates) {
      if (gate.applicable(context)) {
        const result = await gate.evaluate(context);
        results.push(result);
        
        if (result.level === 'BLOCKER' && !result.passed) {
          return {
            passed: false,
            blocker: result,
            results,
          };
        }
      }
    }
    
    const critical = results.filter(r => 
      r.level === 'CRITICAL' && !r.passed
    );
    
    return {
      passed: critical.length === 0,
      results,
      critical,
    };
  }
}

// Gate implementation example
export class TestCoverageGate implements QualityGate {
  name = 'test-coverage';
  level = 'CRITICAL';
  
  applicable(context: EvaluationContext): boolean {
    return context.hasCodeChanges;
  }
  
  async evaluate(context: EvaluationContext): Promise<GateCheckResult> {
    const coverage = await this.getCoverage(context);
    const threshold = context.isHotfix ? 70 : 80;
    
    return {
      name: this.name,
      level: this.level,
      passed: coverage >= threshold,
      message: `Test coverage is ${coverage}% (required: ${threshold}%)`,
      details: {
        coverage,
        threshold,
        files: context.changedFiles,
      },
    };
  }
}
```

## Gate Override Process

### Override Authorization
```yaml
Override Levels:
  P0 (BLOCKER):
    - Required: CTO or VP Engineering
    - Documentation: Root cause and remediation plan
    - Timeline: Fix within 24 hours
    
  P1 (CRITICAL):
    - Required: Engineering Manager
    - Documentation: Justification and fix timeline
    - Timeline: Fix within 1 week
    
  P2 (MAJOR):
    - Required: Tech Lead
    - Documentation: Reason for override
    - Timeline: Fix within sprint
    
  P3 (MINOR):
    - Required: Peer review
    - Documentation: Comment in PR
    - Timeline: Best effort
```

### Override Tracking
```typescript
export class OverrideTracker {
  async recordOverride(override: Override): Promise<void> {
    await this.db.insert('quality_gate_overrides', {
      ...override,
      timestamp: new Date(),
      expires: this.calculateExpiry(override.level),
    });
    
    // Create tracking issue
    await this.createIssue({
      title: `Fix quality gate: ${override.gate}`,
      priority: override.level,
      assignee: override.authorizedBy,
      dueDate: override.fixByDate,
      labels: ['quality-gate', 'technical-debt'],
    });
    
    // Send notifications
    await this.notify({
      channels: ['slack', 'email'],
      recipients: this.getStakeholders(override.level),
      message: `Quality gate overridden: ${override.gate}`,
    });
  }
}
```

## Quality Metrics Dashboard

### Key Performance Indicators
```yaml
Quality KPIs:
  Code Quality:
    - Test coverage trend
    - Code complexity trend
    - Technical debt ratio
    - Defect density
    
  Security:
    - Vulnerability count by severity
    - Time to patch
    - Security gate pass rate
    
  Performance:
    - Response time percentiles
    - Error rate
    - Performance gate pass rate
    
  Process:
    - Gate override frequency
    - Build success rate
    - Deployment frequency
    - Mean time to recovery
```

### Continuous Improvement
```typescript
export class QualityImprovement {
  async analyzeGateTrends(): Promise<Insights> {
    const history = await this.getGateHistory(30); // Last 30 days
    
    return {
      mostFailedGates: this.getTopFailures(history),
      improvingGates: this.getImprovingTrends(history),
      degradingGates: this.getDegradingTrends(history),
      recommendations: this.generateRecommendations(history),
    };
  }
  
  generateRecommendations(history: GateHistory): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Identify recurring failures
    const recurringFailures = this.findRecurringFailures(history);
    
    for (const failure of recurringFailures) {
      recommendations.push({
        gate: failure.gate,
        action: 'Provide training or tooling',
        reason: `Failed ${failure.count} times in last 30 days`,
        priority: failure.count > 10 ? 'HIGH' : 'MEDIUM',
      });
    }
    
    return recommendations;
  }
}