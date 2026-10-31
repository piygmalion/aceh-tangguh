---
name: requesting-code-review
description: Use when completing tasks or implementing major features, to verify work meets requirements before a PR is treated as ready for the owner. A review verdict does not authorize merge or deploy.
---

> **Overlay SIK Aceh.** Atribusi dan suntingan: `docs/agents/skills/ATRIBUSI.md`. Lisensi MIT asli: `docs/agents/skills/LICENSE`. Jawaban dan laporan dalam Bahasa Indonesia. Jika skill ini bentrok dengan `AGENTS.md`, `AGENTS.md` yang berlaku. Reviewer menilai diff. Penilaian bukan GO untuk merge, deploy, atau push ke `main`.

# Requesting Code Review

Dispatch a code reviewer subagent to catch issues before they cascade. The reviewer gets precisely crafted context for evaluation — never your session's history.

**Core principle:** Review early, review often.

## When to Request Review

**Mandatory:**
- After each task in a written plan that asks for review
- After completing a major feature
- Before treating a PR as ready, when the change touches maps, cache, Vercel, or data

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing a complex bug

**Di luar skill ini:**
- Merge, deploy, auto-merge, dan push ke `main`
- Menafsirkan penilaian reviewer sebagai GO Pak Pygmalion
- Skill `subagent-driven-development` (tidak disalin)

## How to Request

**1. Get git SHAs:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or: git merge-base origin/main HEAD
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Dispatch code reviewer subagent:**

Dispatch a `general-purpose` subagent, filling the template at [code-reviewer.md](code-reviewer.md)

**Placeholders:**
- `{DESCRIPTION}` - Brief summary of what you built
- `{PLAN_OR_REQUIREMENTS}` - What it should do
- `{BASE_SHA}` - Starting commit
- `{HEAD_SHA}` - Ending commit

**3. Act on feedback:**
- Fix Critical issues immediately
- Fix Important issues before proceeding
- Note Minor issues for later
- Disagree if the reviewer is wrong (with technical reasoning). Ini bukan `git push`.

## Example

```
[Just completed Task 2: Add verification function]

You: Let me request code review before proceeding.

BASE_SHA=$(git log --oneline | grep "Task 1" | head -1 | cut -d' ' -f1)
HEAD_SHA=$(git rev-parse HEAD)

[Dispatch code reviewer subagent]
  DESCRIPTION: Added verifyIndex() and repairIndex() with 4 issue types
  PLAN_OR_REQUIREMENTS: Task 2 from docs/pengembangan/rencana/YYYY-MM-DD-feature.md
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661

[Subagent returns]:
  Strengths: Clean architecture, real tests
  Issues:
    Important: Missing progress indicators
    Minor: Magic number (100) for reporting interval
  Assessment: Ready to proceed

You: [Fix progress indicators]
[Continue to Task 3]
```

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "I'll just review the diff myself instead of dispatching a reviewer" | You're the coordinator — reviewing the diff inline burns the context window you need to keep driving the work. Dispatch a reviewer subagent: the diff and the evaluation live in its context, and only the findings come back to you. |
| "The reviewer needs my whole session history to understand the change" | Hand it precisely crafted context, never your session's history. That keeps the reviewer on the work product, not your thought process. |

## Red Flags

**Never:**
- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback

**If reviewer wrong:**
- State the disagreement with technical reasoning. Ini bukan `git push`.
- Show code/tests that prove it works
- Request clarification

See template at: [code-reviewer.md](code-reviewer.md)
