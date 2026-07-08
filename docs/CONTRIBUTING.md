# Contributing & Git Workflow
## Project: SwasthyaEHR

> The rule you set: **build part by part. One branch per part → test it → only merge to
> `main` if it works.** `main` must always be runnable.

---

## 1. Branch Strategy

- **`main`** — always working, always demo-able. Never commit directly to it.
- **feature branches** — one per sprint/part. Naming:

```
sprint-1-scaffold
sprint-2-database
sprint-3-pharmacy-safety
sprint-4-lab-fhir
sprint-5-timeline-charts
```

For smaller pieces inside a sprint, use a scoped prefix:
```
feat/doctor-prescription-form
feat/fhir-observation-serializer
fix/allergy-case-insensitive-match
docs/update-api-spec
```

---

## 2. The Loop (do this for every part)

```bash
# 1. Start from an up-to-date main
git checkout main
git pull origin main

# 2. Create the branch for this part
git checkout -b sprint-3-pharmacy-safety

# 3. Build + commit in small steps
git add .
git commit -m "feat(pharmacy): block prescription on allergy match"

# 4. Push the branch
git push -u origin sprint-3-pharmacy-safety

# 5. TEST this part (see section 4). Only continue if it passes.

# 6. Open a Pull Request on GitHub: base = main, compare = your branch
gh pr create --base main --title "Sprint 3: Pharmacy safety interceptor" --body "..."

# 7. Review the diff. If correct, merge.
gh pr merge --squash --delete-branch
```

> Using `--squash` keeps `main` history clean: one tidy commit per merged part.

---

## 3. Commit Message Convention

Format: `type(scope): short description`

| type | when |
| :-- | :-- |
| `feat` | new feature |
| `fix` | bug fix |
| `docs` | documentation only |
| `refactor` | code change, no behavior change |
| `test` | adding/fixing tests |
| `chore` | config, deps, tooling |

Examples:
```
feat(auth): add JWT login endpoint
fix(fhir): add missing valueQuantity.system field
docs(readme): add local setup steps
```

---

## 4. Definition of Done (test before merging)

A part may only merge to `main` when **all** of these pass. Since we're doing **manual
testing**, use this checklist per branch:

**Backend part:**
- [ ] `python manage.py runserver` starts with no errors.
- [ ] `python manage.py makemigrations --check` shows no missing migrations.
- [ ] The new endpoint(s) return the exact payloads in `API_SPECIFICATION.md` (test with
      Postman / Thunder Client / `curl`).
- [ ] Role rules work: a wrong-role token gets `403` (test with two different logins).
- [ ] For FHIR parts: the JSON passes validator.fhir.org with zero errors.

**Frontend part:**
- [ ] `npm run dev` starts and the page renders with no console errors.
- [ ] The happy path works end-to-end against the running backend.
- [ ] The error path works (e.g. allergy banner shows on a blocked prescription).
- [ ] Matches the layout/design rules in `FRONTEND_SPEC.md`.

**Safety-critical part (prescription interceptor):** must have a manual test proving BOTH:
- [ ] A matching drug is **blocked** (400, nothing saved to DB).
- [ ] A safe drug is **saved** (201, appears in pharmacist queue).

Write the manual test steps + result in the PR description.

---

## 5. Pull Request Template

Paste this into every PR body:

```markdown
## What this part does
<one or two sentences>

## Which doc/sprint it implements
<e.g. ROADMAP.md Sprint 3, API_SPECIFICATION.md §7>

## How I tested it (manual)
1. <step>
2. <step>
Result: <what happened>

## Screenshots (if UI)
<paste>

## Checklist
- [ ] Runs locally with no errors
- [ ] Matches the spec payloads/layout
- [ ] Role permissions verified
```

---

## 6. Working with the AI (your workflow)

Since you're building each part with AI assistance:

1. Point the AI at the relevant doc(s) for the current sprint (e.g. "implement
   ROADMAP.md Sprint 2 using DATABASE_SCHEMA.md").
2. Keep the AI's work on the sprint branch, never on `main`.
3. Run the Definition-of-Done checklist yourself before merging — the AI can write code,
   but **you** confirm it actually runs.
4. If a part is broken, fix it on the same branch before merging. Never merge broken
   code "to fix later."

---

## 7. `.gitignore` essentials

Make sure these are ignored from the start:
```
# Python / Django
venv/
__pycache__/
*.pyc
db.sqlite3
.env

# Node / React
node_modules/
dist/
.vite/

# Editor / OS
.vscode/
.DS_Store
```

> **Never commit secrets.** Database passwords and the Django `SECRET_KEY` go in a
> `.env` file that is git-ignored. Commit a `.env.example` with dummy values instead.
