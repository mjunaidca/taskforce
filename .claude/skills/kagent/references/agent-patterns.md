# Kagent Agent Patterns

## Health Monitor Agent

Continuously monitors cluster health and alerts on issues:

```yaml
apiVersion: kagent.dev/v1alpha1
kind: Agent
metadata:
  name: health-monitor
spec:
  schedule: "*/5 * * * *"  # Every 5 minutes
  model:
    provider: openai
    name: gpt-4
  systemPrompt: |
    Monitor cluster health. Report:
    - Pods not in Running state
    - Nodes with pressure conditions
    - Services without endpoints
    - PVCs in Pending state
  actions:
    - type: alert
      condition: issues_found
      destination: slack
```

## Resource Optimizer Agent

Analyzes resource usage and recommends optimizations:

```yaml
apiVersion: kagent.dev/v1alpha1
kind: Agent
metadata:
  name: resource-optimizer
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  model:
    provider: openai
    name: gpt-4
  systemPrompt: |
    Analyze resource usage across all namespaces.
    Identify:
    - Over-provisioned pods (using <50% of requests)
    - Under-provisioned pods (hitting limits)
    - Pods without resource specifications
    Provide specific recommendations with YAML patches.
```

## Security Auditor Agent

Checks for security best practices:

```yaml
apiVersion: kagent.dev/v1alpha1
kind: Agent
metadata:
  name: security-auditor
spec:
  schedule: "0 0 * * *"  # Daily
  model:
    provider: openai
    name: gpt-4
  systemPrompt: |
    Audit cluster for security issues:
    - Containers running as root
    - Pods with hostNetwork/hostPID
    - Secrets in environment variables
    - Missing network policies
    - Privileged containers
    Generate a security report with severity levels.
```

## Deployment Validator Agent

Validates deployments before they go live:

```yaml
apiVersion: kagent.dev/v1alpha1
kind: Agent
metadata:
  name: deployment-validator
spec:
  trigger: deployment-created
  model:
    provider: openai
    name: gpt-4
  systemPrompt: |
    When a new deployment is created, validate:
    - Resource limits are set
    - Readiness/liveness probes exist
    - Image uses specific tag (not :latest)
    - PodDisruptionBudget exists for replicas > 1
    Block deployment if critical issues found.
```

## Troubleshooter Agent

Assists with debugging failed pods:

```yaml
apiVersion: kagent.dev/v1alpha1
kind: Agent
metadata:
  name: troubleshooter
spec:
  trigger: pod-failed
  model:
    provider: openai
    name: gpt-4
  systemPrompt: |
    When a pod fails:
    1. Get pod description and events
    2. Check container logs
    3. Analyze resource usage
    4. Check dependencies (services, configmaps, secrets)
    5. Provide root cause analysis
    6. Suggest remediation steps
```

## Cost Analyzer Agent

Tracks and optimizes cluster costs:

```yaml
apiVersion: kagent.dev/v1alpha1
kind: Agent
metadata:
  name: cost-analyzer
spec:
  schedule: "0 8 * * 1"  # Weekly on Monday
  model:
    provider: openai
    name: gpt-4
  systemPrompt: |
    Analyze cluster resource consumption:
    - Calculate cost per namespace
    - Identify unused resources (PVCs, Services, ConfigMaps)
    - Find opportunities to right-size
    - Compare current vs requested resources
    Generate weekly cost report with savings opportunities.
```
