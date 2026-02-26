# Task-executor

# Skill: Task Execution Engine

## Objective

Process tasks from `TASK.md` one at a time. The most important principle is that **"PR status is the Source of Truth"**. Before starting work, you must synchronize GitHub status with document status.

## Input Data

- `TASK.md` (task list)
- `repos/{target_repo}/CLAUDE.md` (coding conventions)
- GitHub PR Status (`gh pr list`)

## Execution Procedure (Strict Protocol)

### Step 1: Status Synchronization (Source of Truth Check) - Mandatory

1. **Query GitHub Status**:
   - Navigate to the target Repo and execute the command:
   - `gh pr list --state all --json number,title,state,headRefName,mergedAt`
2. **Cross-verify with TASK.md**:
   - If `TASK.md` shows [ ] (incomplete) but the actual PR is Open/Merged -> **PR status is correct.**
   - On discrepancy, immediately update `TASK.md` to match PR status (include PR link).
3. **Dependency Resolution Check (PR Merge Required)**:
   - For each candidate Task, check its `depends_on` (Dependencies) list.
   - A dependency is considered **resolved** only when its corresponding PR is in **Merged** state.
   - If a dependency's PR is still **Open** or **Draft**, the dependent Task **must not be started**.
   - Report the blocking status to the user and wait for instructions.
4. **Select Work Target**:
   - Skip already completed tasks and select the first incomplete Task whose dependencies are **all merged**.

### Step 2: Work Preparation

1. **Load Rules**: Read the target Repo's `CLAUDE.md` and familiarize yourself with the coding style.
2. **Create Branch**:
   - `git checkout -b feature/{project_name}/{task_name}`
   - (e.g., `feature/product-translation-api/TASK-001-booking-api`)

### Step 3: Design Check (UI Tasks Only)

1. **Determine UI involvement**:
   - If the Task includes screen changes, component additions, layout modifications, etc., perform this step.
   - For backend API, logic changes, or other non-UI Tasks, skip this step.

### Step 4: Implementation (Coding)

1. Write code according to the requirements.
2. **Single Responsibility Principle**: Do not touch code outside the scope of the current Task.

### Step 5: Deployment and Documentation

1. **Commit & Push**:
   - `git add .`
   - `git commit -m "{Task-ID}: {message}"`
   - `git push origin {branch_name}`
2. **Create PR**:
   - `gh pr create --title "{Task-ID}: {title}" --body "{detailed description}"`
3. **Update TASK.md**:
   - Change the Task's checkbox to `[x]`.
   - Record the created PR URL next to the corresponding item in `TASK.md`.

## Report Format

After completing work, output the following to the user:

- **Completed Task:** {ID}
- **Created PR:** {URL}
- **Next Recommended Task:** {ID} (considering dependencies)
- **Blocked Tasks:** {IDs and reason if any dependencies are not yet merged}
