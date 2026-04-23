---
description: Commit current changes to main with a good message, then push. Follows the commit-per-change workflow.
---

User wants to ship the current working changes.

**Steps:**

1. Run `git status` and `git diff` in parallel to see what's changed.

2. Run `git log -5 --oneline` to match the repo's commit-message style.

3. Analyse the changes and draft a concise commit message:
   - First line: imperative, under 70 chars, type-prefixed if the repo uses that style (feat, fix, chore, refactor)
   - Body (optional): the *why*, not the *what*

4. Before committing, check for red flags:
   - `.env` or credential-like files staged → stop and warn the user
   - Large binary files → stop and confirm
   - TODO / debug prints left behind → warn but let user decide
   - Tests failing (if a test script exists) → stop and surface the failure

5. Stage the relevant files by name (avoid `git add .`). Create the commit.

6. Push to `origin main`. Surface the remote URL so the user can jump to the Railway deploy.

7. Never use `--no-verify` or `--force` unless the user explicitly asks.

8. If a pre-commit hook fails, fix the root cause and create a new commit (don't amend).
