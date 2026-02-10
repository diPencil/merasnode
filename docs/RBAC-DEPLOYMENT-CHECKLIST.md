# RBAC Strict UI & API – Deployment Checklist

Use this when deploying the `fix/rbac-strict-ui-and-api` branch (or after merging to your main branch).

## Before deployment (AWS server readiness)

- [ ] Application service is running and healthy (`pm2 list` or equivalent).
- [ ] Environment variables are set (e.g. `DATABASE_URL`, `JWT_SECRET`, `NEXTAUTH_URL`).
- [ ] No pending DB migrations that could break the app; if any, ensure they are backward-compatible.
- [ ] Node version on server is **>= 20.9** (required by Next.js 16 and `package.json` engines).

## Deploy steps

1. Pull the latest code on the server (e.g. `git pull` in project directory).
2. Install dependencies: `npm install`.
3. Build: `npm run build`.
4. Restart services with minimal downtime:
   - `pm2 restart ecosystem.config.js` (or your start command).
5. Verify application logs: `pm2 logs` (no critical errors).

## After deployment – verification

- [ ] **Permissions**
  - Log in as **Admin**: Chat options (Export Chat, Block Contact), Contacts (Blocked/Import/Export, Edit/Block/Delete), Bookings (Export Excel, Actions) are visible and work.
  - Log in as **Supervisor**: No Export/Block in chat; no Blocked/Import/Export or Edit/Block/Delete on Contacts; no Export Excel or Actions on Bookings. Book Appointment shows only agents from assigned branches. Bookings list shows only bookings for assigned branches.
  - Log in as **Agent**: Same as Supervisor for visibility; Book Appointment shows only self and is not changeable. Bookings list shows only bookings assigned to them.
- [ ] **Inbox**
  - Agent: Book Appointment agent field is self only and disabled.
  - Supervisor: Book Appointment agent dropdown lists only agents from their branches.
  - Admin: Book Appointment agent dropdown lists all agents.
- [ ] **API**
  - Direct API calls (e.g. PUT/DELETE contact, GET/POST/PUT/DELETE booking) respect role: non-admin contact edit/delete and bulk import return 403; bookings filtered by role and update/delete restricted as designed.
- [ ] **Sessions**
  - Existing sessions and role assignments continue to work; no unexpected logouts or permission errors.

## Rollback

If issues occur after deployment:

1. Revert to the previous release (e.g. `git checkout <previous-tag-or-commit>`).
2. Run `npm install`, `npm run build`, then restart services.
3. Investigate logs and fix forward on the fix branch before redeploying.

## Branch and PR

- All changes are on **fix/rbac-strict-ui-and-api** (no direct push to `main`).
- Open a Pull Request from `fix/rbac-strict-ui-and-api` into your main/default branch.
- After review and merge, deploy from main (or your release branch) following the steps above.
