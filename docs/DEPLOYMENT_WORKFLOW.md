# RESIDENZA — Development & Production GitHub Workflow

This project uses a two-branch workflow so changes can be developed, tested, and previewed safely on **Development/Staging** without affecting live **Production** users.

---

## 1. Branches
- **`develop`** — Active development & staging branch. All daily commits and features land here first.
- **`main`** — Live production branch. Protected; only updated via **Pull Request** from `develop` after CI passes.

### Daily Commands
```bash
# Always make sure you are on develop for daily work
git checkout develop
git pull origin develop

# Commit & push changes to Development
git add -A
git commit -m "feat: describe your change"
git push origin develop
```

When ready to publish to Production:
1. Open a **Pull Request** on GitHub: `develop` → `main`.
2. Wait for the **RESIDENZA CI** checks (`Laravel Backend (PHPUnit)` & `Next.js Frontend (TypeCheck & Build)`) to turn green.
3. Click **Merge pull request** to deploy to Production.

---

## 2. Environment Separation (Vercel + Render + Neon)

### A. Neon PostgreSQL
Create a separate database branch in Neon:
- **`main` DB branch** → used only by Production (`main`).
- **`dev` DB branch** → used by Development/Staging (`develop`) so schema migrations and test data never touch Production.

### B. Render (Laravel Backend — Docker)
Create two Web Services from `AdhamEmad201/Residenza-v2` (Root Directory: `backend`):
- **`residenza-api-prod`** (Branch: `main`) → `DATABASE_URL` = Neon `main` branch.
- **`residenza-api-dev`** (Branch: `develop`) → `DATABASE_URL` = Neon `dev` branch.

### C. Vercel (Next.js Frontend)
Connect `AdhamEmad201/Residenza-v2` (Root Directory: `frontend`):
- **Production Branch (`main`)**:
  - `INTERNAL_BACKEND_URL` = `https://<your-prod-render-url>.onrender.com`
  - `NEXT_PUBLIC_API_URL` = `""`
  - `NEXT_PUBLIC_API_BASE_URL` = `"/api/v1"`
- **Preview / `develop` Branch**:
  - `INTERNAL_BACKEND_URL` = `https://<your-dev-render-url>.onrender.com`
  - `NEXT_PUBLIC_API_URL` = `""`
  - `NEXT_PUBLIC_API_BASE_URL` = `"/api/v1"`

---

## 3. GitHub Branch Protection (One-Time UI Setup)
In GitHub Repository **`Settings → Branches → Add branch protection rule`**:
1. **Branch name pattern:** `main`
2. Enable **Require a pull request before merging**
3. Enable **Require status checks to pass before merging** and select:
   - `Laravel Backend (PHPUnit)`
   - `Next.js Frontend (TypeCheck & Build)`
