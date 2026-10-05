# AGENTS.md — Git & Commit Guidelines

1. **DO NOT `git push` UNDER ANY CIRCUMSTANCES.**
   - All commits must remain local only.
   - Pushing to remote repositories is strictly managed by the user.

2. **Use Conventional Commits:**
   - Commit messages must follow the conventional commits specification (`feat:`, `chore:`, `fix:`, `perf:`, `test:`, `refactor:`, `docs:`).
   - Do **not** prefix commits with milestone identifiers (e.g. no `M0:`, `M1:`, etc.).

3. **One Commit per Milestone:**
   - Each milestone should be encapsulated in exactly one atomic commit upon full completion and verification, unless explicitly instructed otherwise.

4. **Explicit Permission Required Before Proceeding:**
   - Never start a milestone, make speculative code changes, or proceed past a milestone boundary without explicit user instruction.
   - When paused or asked to review, stop all tool execution immediately.
