# Automation Script Builder Skill

**Pattern Name:** Self-Documenting Flexible Automation Scripts
**Created:** 2025-12-10
**Source:** TaskFlow K8s deployment simplification

---

## When to Use This Skill

Apply this pattern when you need to:
- ✅ Simplify complex multi-step workflows
- ✅ Replace multiple confusing scripts with one flexible script
- ✅ Create CLI tools with multiple operational modes
- ✅ Build deployment/build/automation scripts that "no one can remember"

**Examples:**
- Kubernetes/Docker deployment scripts
- Build pipelines (test, lint, build, deploy)
- Development environment setup
- Database migration/seeding workflows
- CI/CD automation

---

## The Method (4 Steps)

### 1. **Consolidate** - Find the One True Script

**Before:** Multiple scripts doing similar things
```
scripts/
├── deploy.sh
├── deploy-clean.sh
├── deploy-fast.sh
├── deploy-with-db.sh
├── reset.sh
└── start-offline.sh
```

**After:** One script with flags
```
scripts/
└── deploy.sh [--fast] [--clean] [--db] [--rebuild]
```

**Actions:**
1. List all related scripts
2. Identify common operations
3. Merge into single entry point
4. Delete obsolete scripts

---

### 2. **Add Flexibility** - Flags for Every Use Case

**Flag Design Principles:**
- Each flag is **independent** (can combine freely)
- Names are **intuitive** (what they do is obvious)
- Defaults are **safe** (no surprises)
- Effects are **time-estimated** (users know cost)

**Flag Pattern:**
```bash
# Parse flags
FLAG_ONE=false
FLAG_TWO=false

for arg in "$@"; do
  case $arg in
    --flag-one)
      FLAG_ONE=true
      shift
      ;;
    --flag-two)
      FLAG_TWO=true
      shift
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: $0 [--flag-one] [--flag-two]"
      exit 1
      ;;
  esac
done

# Use flags
if [ "$FLAG_ONE" = true ]; then
  # Do thing one
fi
```

**Common Flag Types:**
- **Speed flags:** `--fast`, `--skip-cleanup`, `--quick`
- **Rebuild flags:** `--rebuild`, `--fresh`, `--clean`
- **Access flags:** `--port-forward`, `--expose`, `--tunnel`
- **Extra features:** `--db-gui`, `--debug`, `--verbose`

---

### 3. **Document Exhaustively** - Copy-Paste Ready

**Documentation Structure:**

#### A. Flags Table
```markdown
| Flag | What It Does | Time Impact |
|------|--------------|-------------|
| `--fast` | Skip cleanup steps | Saves 5min |
| `--rebuild` | Force rebuild images | +10min |
```

#### B. Common Workflows Section
```markdown
## Common Workflows (Copy-Paste Ready)

### 🚀 Daily Development (Most Common)
```bash
./script.sh --fast --access
```
**Time:** 2-3 minutes | **Use when:** Quick iteration

### 🔨 After Code Changes
```bash
./script.sh --rebuild --fast
```
**Time:** 7-8 minutes | **Use when:** Code/dependency changes
```

**Workflow Guidelines:**
- 5-7 most common scenarios
- Emoji for visual scanning (🚀🔨🆕🧹🔥🗄️⚡)
- Time estimates for each
- "Use when" guidance
- Copy-paste ready commands

#### C. Quick Reference
```markdown
**Quick Reference:**
- **Daily:** `./script.sh --fast` (2min)
- **Rebuild:** `./script.sh --rebuild --fast` (7min)
- **Clean:** `./script.sh --clean` (10min)
```

---

### 4. **Provide Examples** - Make It Obvious

**In-Script Usage Comments:**
```bash
# Usage:
#   ./script.sh                          # Default
#   ./script.sh --fast                   # Quick mode
#   ./script.sh --rebuild --fast         # Rebuild + quick
```

**README Examples:**
- Show all flag combinations
- Explain flag interaction
- Provide decision matrix ("when to use what")

---

## Implementation Checklist

### Script Creation
- [ ] Consolidate related scripts into one
- [ ] Add flag parsing with clear error messages
- [ ] Make flags combinable (independent)
- [ ] Set safe defaults
- [ ] Add time estimates in output
- [ ] Test all flag combinations

### Documentation
- [ ] Create flags table with time impacts
- [ ] Write 5-7 common workflow examples
- [ ] Add quick reference section
- [ ] Include "When to Use" guidance
- [ ] Make examples copy-paste ready
- [ ] Test documentation with fresh eyes

### Validation
- [ ] Can new user find their workflow in <10 seconds?
- [ ] Are all commands copy-paste ready?
- [ ] Does script output guide users?
- [ ] Are time estimates accurate?
- [ ] Can you come back in 6 months and remember?

---

## Anti-Patterns (Avoid These)

❌ **Multiple similar scripts** - Consolidate them
❌ **Flags that conflict** - Make them combinable
❌ **Undocumented behavior** - Document everything
❌ **Missing time estimates** - Always show expected time
❌ **No use case guidance** - Tell users "when to use"
❌ **Complex examples** - Keep it copy-paste simple

---

## Real-World Example: TaskFlow K8s Deployment

**Problem:** 7 deployment scripts, confusing options, slow iteration

**Solution:**
```bash
# Daily dev (most common)
./scripts/deploy-local.sh --skip-cleanup --port-forward  # 2-3 min

# After code changes
./scripts/deploy-local.sh --rebuild --skip-cleanup --port-forward  # 7-8 min

# Fresh start
./scripts/deploy-local.sh --port-forward  # 10 min
```

**Result:**
- One script replaces 7 scripts
- 4 flags cover all use cases
- 7 documented workflows
- <10 seconds to find right command
- "No one needs to remember" achieved

---

## Template: Quick Start

```bash
#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# [SCRIPT NAME]
#
# Usage:
#   ./script.sh                      # Default
#   ./script.sh --fast               # Fast mode
#   ./script.sh --rebuild            # With rebuild
###############################################################################

# Parse flags
FAST=false
REBUILD=false

for arg in "$@"; do
  case $arg in
    --fast)
      FAST=true
      shift
      ;;
    --rebuild)
      REBUILD=true
      shift
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: $0 [--fast] [--rebuild]"
      exit 1
      ;;
  esac
done

echo "🚀 [Script Name]"
echo "================="
echo ""

# Main logic with flag checks
if [ "$REBUILD" = true ]; then
  echo "🔨 Rebuilding..."
  # Rebuild logic
fi

if [ "$FAST" = true ]; then
  echo "⚡ Fast mode..."
  # Skip slow steps
else
  echo "🧹 Full clean..."
  # Do all steps
fi

echo "✅ Done!"
echo ""
echo "📋 Useful commands:"
echo "   ./script.sh --fast              # Quick (2min)"
echo "   ./script.sh --rebuild --fast    # Rebuild + quick (7min)"
echo ""
```

---

## Skill Application Examples

### Use Case 1: Docker Compose Deployment
```bash
./deploy.sh --fast                    # Skip build, use cached images
./deploy.sh --rebuild                 # Force rebuild all services
./deploy.sh --rebuild --fast          # Rebuild + skip cleanup
./deploy.sh --db-gui                  # Include Adminer
```

### Use Case 2: Build Pipeline
```bash
./build.sh --skip-tests               # Fast build
./build.sh --clean                    # Clean build
./build.sh --watch                    # Watch mode
./build.sh --clean --skip-tests       # Clean but fast
```

### Use Case 3: Database Operations
```bash
./db.sh --migrate                     # Run migrations
./db.sh --seed                        # Seed data
./db.sh --reset --seed                # Reset + seed
./db.sh --backup                      # Backup before ops
```

---

## Key Learnings from TaskFlow Implementation

1. **Helm vs Direct Manifests:** For local dev, Kustomize would be simpler. Helm adds value for:
   - Production deployments
   - Multi-environment configs
   - Industry-standard patterns
   - `helm upgrade --install` idempotency

2. **Flag Combinations:** All flags should work together freely:
   - `--skip-cleanup` + `--rebuild` = Fast rebuild
   - `--port-forward` + any other flag = Always works

3. **Time Transparency:** Users need to know:
   - How long will this take?
   - What's the fast option?
   - What's the trade-off?

4. **Documentation as Memory:**
   - "No one can remember over time" is real
   - Copy-paste ready workflows solve this
   - Visual hierarchy (emojis, tables) helps scanning

---

## Maintenance

**When to update:**
- New flags added → Update flags table + workflows
- Timing changes → Update time estimates
- New common use case → Add to workflows section

**Keep documentation in sync:**
- Script usage comments
- README flags table
- README workflows section
- README quick reference

---

## Success Metrics

✅ New team member finds their workflow in <10 seconds
✅ You can come back in 6 months and remember
✅ Zero "how do I deploy again?" questions
✅ Everyone uses same commands (no tribal knowledge)
✅ Script output guides users (no doc hunting)

---

**Created from:** TaskFlow Phase IV K8s deployment simplification
**Pattern proven:** Replaced 7 scripts with 1 flexible script + comprehensive docs
