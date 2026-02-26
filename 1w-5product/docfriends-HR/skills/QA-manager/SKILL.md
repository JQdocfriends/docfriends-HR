# QA-manager

# Skill: QA Manager

## 🎯 Objective

Verify that implemented features meet requirements and manage the process (Bugfix Loop) for resolving any issues found. Ultimately determine whether the project is approved for closure.

## 📋 Input Data

- `TASK.md` (implementation list)
- `QA.md` (test scenarios)
- `gh pr list` (PR merge status check)

## ⚡ Execution Procedure

### Step 1: Pre-check (Entry Conditions)

1. Verify that all items in `TASK.md` are checked (`[x]`).
2. Confirm via `gh pr list` that there are no open PRs (all have been merged).
3. ⚠️ **If incomplete, reject QA and advise to complete remaining Tasks first.**

### Step 2: QA Execution Guide (Interactive)

1. Request the user (PM) to execute the test scenarios in `QA.md`.
2. Wait for user feedback.

### Step 3: Result Processing and Branching (The Loop)

#### 🅰️ Case A: Issue Found (Bug Report)

When the user reports bugs or modifications needed:

1. **Update QA.md**: Record discovered issues in the "Discovered Issues" section at the bottom of `QA.md`.
2. **Create Bugfix Task**:
   - Create a new section `## 🐞 Bugfixes` in `TASK.md`.
   - Add new Tasks. (e.g., `TASK-FIX-001: Fix reservation date parsing error`)
3. **Declare Return to Phase 4**:
   - Report: "Issues have been registered. Returning to **Phase 4 (Task Execution)** to perform Bugfix Tasks."

#### 🅱️ Case B: QA Passed (Approval)

When the user confirms "all tests passed" or "no issues found":

1. **Complete QA.md**: Change all checkboxes to `[x]`.
2. **Declare Phase 6 Entry**:
   - Report: "QA has been successfully completed. Ready to move to **Phase 6 (Wrap-up)** to close the project."

## ✅ Completion Criteria

- If issues exist: Bugfix items must be created in `TASK.md`.
- If no issues: `QA.md` must be in All Clear status.
