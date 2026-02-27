# My-agent-teams

# Skill: Team-Based Parallel Execution

## Objective

Execute large multi-task projects using coordinated agent teams. Spawn 3-4 executor agents per batch, assign domain-grouped tasks, and iterate through batches with build verification between each. This workflow was proven on the Town HR project (35 tasks, 6 batches, 187 files, 53K+ lines).

## Input Data

- A task list (from `TASK.md`, a plan, or user instructions)
- Codebase context (existing files, APIs, types, conventions)

## Core Configuration

| Parameter | Value | Notes |
|-----------|-------|-------|
| Agents per batch | 3-4 | Sweet spot for parallelism without conflicts |
| Tasks per agent | 1-3 | Group by domain affinity |
| Agent type | `oh-my-claudecode:executor` | Sonnet, full tool access |
| Agent mode | `bypassPermissions` | No permission prompts during execution |
| Naming | `{domain}-builder` or `{domain}-agent` | Lowercase, hyphenated |

## Execution Procedure

### Step 1: Batch Planning

Group all tasks into batches of 5-8 tasks each. Grouping rules:

1. **Domain affinity**: Tasks touching the same area go to the same agent
2. **Dependency order**: Earlier batches create foundations, later batches build on them
3. **Balance workload**: Roughly equal complexity per agent within a batch
4. **Minimize conflicts**: Avoid two agents writing to the same file

Example grouping from Town HR:

| Batch | Theme | Agents | Tasks |
|-------|-------|--------|-------|
| 1 | Setup wizard (single complex feature) | 3 | 3 |
| 2 | Settings + independent features | 4 | 6 |
| 3 | Org structure, attendance, contracts | 3 | 9 |
| 4 | Members, workflows, infrastructure | 4 | 9 |
| 5 | Submissions, dashboard, reports | 4 | 6 |
| 6 | Final enhancements | 3 | 5 |

### Step 2: Create Team

```
TeamCreate(
    team_name='batch-N-descriptive-name',
    description='Build TASK-XXX/YYY/ZZZ: brief summary'
)
```

**Naming conventions:**
- Single feature: `task-001-setup-wizard`
- Multi-task batch: `batch-2-settings-and-independent`
- Final batch: `batch-6-final`

### Step 3: Create Tasks

Create all tasks for the batch using TaskCreate:

```
TaskCreate(
    subject='TASK-NNN: Brief imperative description',
    activeForm='Building [feature name]',
    description='Detailed specification with file paths, types, and acceptance criteria'
)
```

All TaskCreate calls can be made in parallel (no dependencies between them).

### Step 4: Spawn Agents (All in Parallel)

Spawn all agents in a single message with multiple Task tool calls:

```
Task(
    team_name='batch-N-descriptive-name',
    name='domain-builder',
    subagent_type='oh-my-claudecode:executor',
    mode='bypassPermissions',
    prompt='''You are "domain-builder" on team "batch-N-descriptive-name".

Your tasks:
1. TASK-XXX: [title]
2. TASK-YYY: [title]

## TASK-XXX: [Title]

### Files to Create/Modify
- `src/app/feature/page.tsx` - Main page component
- `src/components/feature/Form.tsx` - Form component

### Requirements
[Detailed specs - what, not how]

### Context
- Use existing hook: `useAuthContext` from `@/hooks/useAuth`
- Import UI from `@/components/ui/*`
- Follow existing patterns in `src/app/other-feature/page.tsx`
- Types defined in `src/types/feature.ts`

### Acceptance Criteria
- [ ] Page renders at /feature route
- [ ] Form validates required fields
- [ ] Submits to API endpoint

## TASK-YYY: [Title]
[Same structure as above]
'''
)
```

### Step 5: Assign Tasks (All in Parallel)

Assign tasks to agents in a single message:

```
TaskUpdate(taskId='1', owner='domain-builder', status='in_progress')
TaskUpdate(taskId='2', owner='domain-builder', status='in_progress')
TaskUpdate(taskId='3', owner='other-builder', status='in_progress')
```

### Step 6: Monitor and Wait

Agents work autonomously. They send messages when:
- They complete tasks (mark as completed via TaskUpdate)
- They encounter blockers (ask for help via SendMessage)
- They go idle (automatic notification)

Respond to questions and blockers as they arise.

### Step 7: Shutdown Agents (All in Parallel)

When all tasks are complete, shut down all agents:

```
SendMessage(type='shutdown_request', recipient='domain-builder', content='All tasks complete. Shutting down.')
SendMessage(type='shutdown_request', recipient='other-builder', content='All tasks complete. Shutting down.')
```

### Step 8: Verify Build

Run build/type check between every batch:

```bash
npm run build
# or
npm run typecheck
```

Fix any integration issues before starting the next batch.

### Step 9: Cleanup and Next Batch

```
TeamDelete()
```

Then repeat from Step 2 for the next batch.

## Task Prompt Template

The prompt given to each agent is the most critical part. Use this exact structure:

```
You are "{agent-name}" on team "{team-name}".

Your tasks:
1. TASK-XXX: [title]
2. TASK-YYY: [title]

## TASK-XXX: [Title]

### Files to Create/Modify
- `{absolute-or-relative-path}` - [purpose]

### Requirements
- [Specific, actionable requirements]
- [Include field names, API endpoints, route paths]

### Types / Interfaces
```typescript
// Include relevant type definitions the agent will need
interface Feature {
  id: string;
  name: string;
}
```

### Context
- Existing patterns to follow: [file path]
- Hooks/utilities to reuse: [import paths]
- API endpoints available: [routes]
- Shared components: [component paths]

### Acceptance Criteria
- [ ] [Testable criterion 1]
- [ ] [Testable criterion 2]

## TASK-YYY: [Title]
[Same structure]
```

**Key principles for prompts:**
1. **Be specific about file paths** - agents should not guess where files go
2. **Provide types** - include TypeScript interfaces, API schemas
3. **Reference existing patterns** - point to similar files to follow
4. **List imports** - tell agents what hooks/components/utilities exist
5. **Define acceptance criteria** - agents know when they're done

## Complete Example: Batch 1 from Town HR

```python
# STEP 1: Create Team
TeamCreate(
    team_name='task-001-setup-wizard',
    description='Build TASK-001: Company setup wizard (4-step onboarding). Parallelized across 3 executors.'
)

# STEP 2: Create Tasks
TaskCreate(
    subject='Build setup wizard shell (layout, page, progress, middleware)',
    activeForm='Building setup wizard shell',
    description='Create the onboarding setup wizard container with layout, main page, progress indicator, and middleware integration.'
)
TaskCreate(
    subject='Build Step 1 (company info) and Step 2 (work policy) components',
    activeForm='Building step 1 and step 2 components',
    description='Create two onboarding step components: company info form and work policy form.'
)
TaskCreate(
    subject='Build Step 3 (organization) and Step 4 (invite) components',
    activeForm='Building step 3 and step 4 components',
    description='Create two onboarding step components: org structure setup and member invitation.'
)

# STEP 3: Spawn Agents (ALL IN PARALLEL - single message)
Task(
    team_name='task-001-setup-wizard',
    name='shell-builder',
    subagent_type='oh-my-claudecode:executor',
    mode='bypassPermissions',
    prompt='''You are "shell-builder" on team "task-001-setup-wizard".

Your task: Build the setup wizard shell - layout, main page, progress indicator.

## Files to Create
- `src/app/(onboarding)/setup/layout.tsx` - Minimal layout without sidebar
- `src/app/(onboarding)/setup/page.tsx` - Main wizard page with step state
- `src/components/onboarding/ProgressIndicator.tsx` - Step progress bar

## Context
- Use existing hooks: useAuthContext, useCompany
- Import UI from @/components/ui/*
- Follow the (dashboard) layout pattern for route group structure
'''
)

Task(
    team_name='task-001-setup-wizard',
    name='steps-1-2',
    subagent_type='oh-my-claudecode:executor',
    mode='bypassPermissions',
    prompt='''You are "steps-1-2" on team "task-001-setup-wizard".

Your task: Build Step 1 (company info) and Step 2 (work policy) components.

## Files to Create
- `src/components/onboarding/Step1CompanyInfo.tsx`
- `src/components/onboarding/Step2WorkPolicy.tsx`

## Requirements
Step 1 fields: name, representativeName, businessNumber, address, phone
Step 2 fields: workingHoursPerDay, daysPerWeek, overtimePolicy
'''
)

Task(
    team_name='task-001-setup-wizard',
    name='steps-3-4',
    subagent_type='oh-my-claudecode:executor',
    mode='bypassPermissions',
    prompt='''You are "steps-3-4" on team "task-001-setup-wizard".

Your task: Build Step 3 (organization) and Step 4 (invite) components.

## Files to Create
- `src/components/onboarding/Step3Organization.tsx`
- `src/components/onboarding/Step4Invite.tsx`

## Requirements
Step 3: Department and team creation with add/remove
Step 4: Email + role selection for member invitations
'''
)

# STEP 4: Assign Tasks (ALL IN PARALLEL - single message)
TaskUpdate(taskId='1', owner='shell-builder', status='in_progress')
TaskUpdate(taskId='2', owner='steps-1-2', status='in_progress')
TaskUpdate(taskId='3', owner='steps-3-4', status='in_progress')

# STEP 5: Wait for agents to complete...

# STEP 6: Shutdown (ALL IN PARALLEL - single message)
SendMessage(type='shutdown_request', recipient='shell-builder', content='TASK-001 complete. Shutting down team.')
SendMessage(type='shutdown_request', recipient='steps-1-2', content='TASK-001 complete. Shutting down team.')
SendMessage(type='shutdown_request', recipient='steps-3-4', content='TASK-001 complete. Shutting down team.')

# STEP 7: Cleanup
TeamDelete()

# STEP 8: Verify
# npm run build
```

## Tips and Lessons Learned

1. **3-4 agents is the sweet spot** - More agents cause file conflicts and coordination overhead
2. **Domain grouping reduces conflicts** - Agents working on different directories rarely clash
3. **Detailed prompts save time** - Spending 2 minutes on a thorough prompt saves 10 minutes of agent confusion
4. **Verify between batches** - Catching a type error after batch 2 is cheaper than after batch 6
5. **Use `executor-low` for simple tasks** - Deployment configs, single-file changes don't need full executor
6. **Include existing code patterns** - Agents produce more consistent code when shown examples
7. **Absolute paths prevent ambiguity** - Especially when the project has nested directories

## Report Format

After completing all batches, output:

- **Total Tasks Completed:** {count}
- **Total Batches:** {count}
- **Files Created/Modified:** {count}
- **Build Status:** Pass/Fail
- **Test Status:** Pass/Fail (if applicable)
- **Remaining Issues:** {list or "None"}
