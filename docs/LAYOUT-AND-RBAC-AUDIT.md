# Layout & RBAC Audit (Feb 2025)

## Layout fixes applied

- **Desktop sidebar (ChatGPT-style)**: Sidebar is fixed; only the middle navigation list scrolls. Brand, Create Template/Bot Flow, and bottom (user profile, Settings, Log out) stay fixed.
- **Scroll containment**: `html`/`body` use `overflow: hidden` and fixed height; only the main content area scrolls. App shell uses `height: 100vh` (mobile: `--app-vh`) so the document never scrolls.
- **App layout**: `fullBleed` restored for inbox; main uses `min-h-0` and `overflow-auto` or `overflow-hidden` for full-bleed pages.
- **Mobile inbox**: Chat column is a fixed overlay above bottom nav; header and input bar are fixed, message list scrolls. Uses `visualViewport` for keyboard-aware height where supported.
- **RTL**: Conversations list and CRM sidebar use logical borders (`border-s`/`border-e`) based on `dir`. Sheet/Info panel opens from the correct side.

## User permissions & visibility (confirmation)

Backend enforces role-based visibility:

- **Agents**: See only their own statistics and conversations (assigned to them or linked to their WhatsApp accounts). `buildConversationScopeFilter` and dashboard stats use `scope.userId` / `scope.whatsappAccountIds` / `scope.branchIds`.
- **Supervisors**: See statistics and conversations for their assigned branches/users only. APIs use `scope.branchIds` for filtering.
- **Admin**: See all statistics, branches, users, and WhatsApp accounts; no extra filters.
- **WhatsApp account assignment**: When an account is assigned to a branch/user, conversation and message APIs filter by that assignment so other users do not see those conversations.

Relevant code: `lib/api-auth.ts` (`buildConversationScopeFilter`, `requireAuthWithScope`), `app/api/conversations/route.ts`, `app/api/dashboard/stats/route.ts`.
