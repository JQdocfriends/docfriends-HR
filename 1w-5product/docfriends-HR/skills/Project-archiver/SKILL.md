# Project-archiver

# Skill: Project Archiver

## 🎯 Objective

Preserve completed project deliverables (move to `projects/`) and initialize the workspace for the next project. Projects that have not completed QA cannot be archived.

## 📋 Input Data

- `QA.md`
- `PRD.md`, `TASK.md`
- Current date (YYYYMMDD)

## ⚡ Execution Procedure

1. **Verify Closure Conditions**
   - Read `QA.md` and confirm all checklists have passed.
   - If any items have not passed, reject archiving and report the issues.
2. **Create Archiving Directory**
   - Format: `projects/{YYYYMMDD}_{project_name}/`
   - (e.g., `projects/20260127_booking-refactor/`)
3. **Move Deliverables**
   - Copy/move core documents from root to the archiving folder:
     - `PRD.md`
     - `TASK.md`
     - `QA.md`
   - If `CONTEXT.md` contains project-specific content, copy it but keep the file itself in place.
4. **Reset Workspace**
   - Clear or reset `PRD.md`, `TASK.md`, `QA.md` at the root to their initial template state.
   - Check out branches under `repos/` to their `base_branch`.
5. **Save Record (Meta Commit)**
   - Commit this configuration repository (doctalk-reservation-settings) itself.
   - `git add projects/`
   - `git commit -m "Archive: {project_name} (Date: {Today})"`
   - `git push origin main`

## ✅ Completion Criteria

- Documents are safely stored in the `projects/` folder.
- Root directory is clean.
- Archiving history is pushed to Git.
