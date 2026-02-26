# Task-planner

# Skill: Task Planner

## 🎯 Objective

Analyze the finalized requirements (`PRD.md`) and produce `TASK.md` with units that developers can immediately start working on.
Development order, dependencies, and target repositories must be clearly defined.

## 📋 Input Data

- `PRD.md` (planning document)
- `REPOS.md` (repository information)
- `CONTEXT.md` (for understanding overall architecture)

## ⚡ Execution Procedure

### Step 1: Requirements Analysis and Structuring

1. Read the functional requirements in `PRD.md` and classify tasks into **Frontend** and **Backend**.
2. Refer to `REPOS.md` to designate the **Target Repository** where each feature will be implemented.

### Step 2: Task Decomposition (Granularity Control)

1. **Single Responsibility Principle**: One Task should lead to "one PR". Break down features that are too large.
2. **Naming Convention**: Use the format `TASK-{number}: {title}`. (e.g., `TASK-001: Reservation API schema design`)
3. **Task Description**: Include 1-2 lines of specific description for each Task explaining what needs to be done.

### Step 3: Dependency Design

1. Determine the logical order. (e.g., API design → API implementation → UI implementation)
2. Use the `depends_on` field to specify prerequisite tasks.

### Step 4: Write TASK.md

Create (or overwrite) the `TASK.md` file using the format below:

```markdown
# Project Task List

## 📅 Backend (doctalk_server_booking)

- [ ] **TASK-001: Implement reservation query API**
  - Description: Implement GET /v1/bookings endpoint and write test code
  - Dependencies: None

## 💻 Frontend (doctalk_reservation_admin)

- [ ] **TASK-002: Reservation list page UI**
  - Description: Publish reservation list component and integrate with API
  - Dependencies: TASK-001

...
```
