# Copilot / Agent Instructions for this repository

Purpose
- Short, actionable guidance for AI coding agents and contributors working on this Vite + React frontend.

Quick environment commands
- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build production: `npm run build`
- Preview build: `npm run preview`
- Lint code: `npm run lint`

PR Checklist (keep PRs small and focused)
- Title: start with a short prefix (feat/, fix/, refactor/, docs/), descriptive title.
- Description: one-paragraph summary and a short list of changes with file references.
- Verify locally:
  - Run `npm run lint` and fix issues.
  - Run `npm run dev` and sanity-check affected UI flows.
  - If tests exist, run them.
- Files: avoid unrelated formatting or whitespace-only changes.
- Tests: add unit or component tests for new UI behavior where feasible.
- Docs: update `client_docs/` or `README.md` with any developer-facing changes.
- Changelog: add a short entry if this affects users or deployment.
- Reviewers: request 1–2 reviewers for UI or logic changes.

Agent rules
- Link to existing docs rather than embedding large blocks of text.
- Prefer minimal, focused edits; do not perform broad automated refactors without tests.
- When adding dependencies, update `package.json` and add a short justification in the PR.
- If you change runtime behavior, include manual verification steps in the PR description.

Notes & suggestions
- No test runner is configured by default — consider adding Vitest + React Testing Library for component tests.
- Consider a `CONTRIBUTING.md` to document branch strategy and PR labels.

Generated to help agents onboard quickly. Customize further if you have CI, tests, or contributor rules to include.
