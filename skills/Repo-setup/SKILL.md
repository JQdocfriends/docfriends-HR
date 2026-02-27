# Repo-setup

# Skill: Repo Setup Specialist

## 🎯 Objective

Prepare all target repositories defined in `REPOS.md` in an up-to-date state under the `repos/` directory.
Update existing repositories with `git pull` and clone missing ones with `git clone`.

## 📋 Input Data

- Root `REPOS.md` file

## ⚡ Execution Procedure

1. **Parse Information**
   - Read `REPOS.md` and identify each repository's `url`, `base_branch`, and `description`.
   - Create the `repos/` directory if it does not exist.
2. **Iterate and Synchronize Repositories** (performed for each repository)

   - **Case A: `repos/{repo_name}` directory already exists**

     1. Navigate to the directory (`cd repos/{repo_name}`).
     2. Check current status with `git status`.
     3. Check out the `base_branch` (`git checkout {base_branch}`).
     4. Pull the latest code (`git pull origin {base_branch}`).

   - **Case B: Directory does not exist**
     1. Run `git clone {url} {repo_name}` from the `repos/` directory.
     2. Navigate to the cloned directory and check out the `base_branch`.

3. **Context Check**
   - Verify whether `CLAUDE.md` (coding rules) exists inside each repository.
   - If absent, notify the user: "Warning: {repo_name} does not have a CLAUDE.md".
4. **Return to Root**
   - After all work is complete, always return to the project root (`../../`).

## ✅ Completion Criteria

- All repositories must exist under `repos/`.
- All repositories must be on the latest `base_branch` state.
- A "All repositories ready" report must be output to the user.
