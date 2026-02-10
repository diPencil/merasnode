# RBAC Deployment Checklist (Strict Role-Based UI & API)

Use this checklist when deploying the **fix/rbac-strict-inbox-contacts-bookings** branch (or any RBAC-related release).

---

## 1. GitHub Workflow

- [ ] **Do NOT push directly to `main`.** Use the fix branch and open a Pull Request.
- [ ] All changes are in **atomic commits** with clear messages, e.g.:
  - `fix(contacts): hide Edit in contact details sheet for non-Admin`
  - `fix(contacts): restrict bulk import to Admin only in API`
  - `fix(contacts): scope GET contact by id for non-Admin (branch access)`
- [ ] After pushing the fix branch, **open a PR** into `main` (or your default branch).
- [ ] Verify no unrelated UI or permission logic is changed; RBAC-only changes are included.
- [ ] Ensure rollback safety: branch can be reverted or main not merged if issues are found.

---

## 2. Pre-Deployment (AWS Server Readiness)

Before merging and deploying:

- [ ] **Application service** is running and healthy on the server (e.g. `pm2 list`).
- [ ] **Environment variables** are intact (`.env` or server env): `DATABASE_URL`, `JWT_SECRET`, `NEXTAUTH_URL`, etc.
- [ ] **Database**: No new migrations in this RBAC set; if any were added, ensure they are **backward-compatible** and run `npx prisma migrate deploy` after pull.
- [ ] **Sessions / roles**: No schema change to users or roles; existing sessions and role assignments remain valid.

---

## 3. Deployment Steps (Zero or Minimal Downtime)

- [ ] On the server: pull the branch (after merge) or the fix branch for testing:
  ```bash
  cd ~/MerasNode   # or your app path
  git fetch origin
  git checkout main && git pull origin main
  # OR for testing: git checkout fix/rbac-strict-inbox-contacts-bookings && git pull
  ```
- [ ] Install deps and build:
  ```bash
  pnpm install
  pnpm run build
  ```
- [ ] Restart the app safely (e.g. PM2):
  ```bash
  pm2 restart all
  # or: pm2 restart ecosystem.config.js --only MerasNode
  ```
- [ ] Prefer **rolling restart** or **reload** if your process manager supports it to minimize downtime.

---

## 4. Post-Deployment Verification

- [ ] **Application logs**: Check for errors (`pm2 logs` or your log path).
- [ ] **Permissions**:
  - **Admin**: Can see Block Contact, Export Chat (inbox); Blocked Contacts, Import, Export, Edit/Block/Delete (contacts); Export Excel and Actions (bookings). Can select any agent in Book Appointment.
  - **Supervisor**: Cannot see Block/Export in inbox; cannot see Blocked/Import/Export or Edit/Block/Delete in contacts; cannot see Export or Actions in bookings. Can select only agents from their branches in Book Appointment. Sees only branch-scoped contacts and bookings.
  - **Agent**: Same as Supervisor for visibility; Book Appointment agent is fixed to self and not changeable. Sees only own bookings and branch-scoped contacts.
- [ ] **Inbox**: Chat options (Block Contact, Export Chat) visible only when logged in as Admin.
- [ ] **Bookings**: Export Excel and Actions column/dropdown visible only for Admin; list filtered by role (Agent = own, Supervisor = branch, Admin = all).
- [ ] **Contacts**: Blocked Contacts, Import, Export, and Edit/Block/Delete (including Edit in contact details sheet) visible only for Admin. Single-contact GET returns 403 for non-Admin when contact is outside their branch.
- [ ] **API**: Direct API calls (e.g. PUT/DELETE contact, bulk import, GET contact by id for another branch) return 401/403 when not allowed for the role.

---

## 5. Rollback (If Needed)

- [ ] Revert the merge commit on `main` or redeploy the previous tag/commit.
- [ ] Restart the application and verify logs.
- [ ] No database rollback needed for this RBAC-only release (no migrations).

---

## Summary of RBAC Changes in This Branch

| Area | UI | API |
|------|----|-----|
| Inbox – Block/Export chat | Admin only | Block via contact update = Admin only |
| Inbox – Book Appointment agent | Agent=self, Supervisor=branch, Admin=any | `GET /api/users/agents` and `POST /api/bookings` scoped |
| Contacts – Blocked/Import/Export/Edit/Block/Delete | Admin only (including Edit in sheet) | PUT/DELETE = Admin only; bulk import = Admin only; GET by id = branch-scoped for non-Admin |
| Bookings – Export & Actions | Admin only | GET/PUT/DELETE scoped by role |
