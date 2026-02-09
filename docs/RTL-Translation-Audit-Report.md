# RTL + i18n + UI Consistency Audit Report

**Scope:** Inbox Page, Sidebar, Topbar (first phase)  
**Date:** 2025-02-09

---

## 1. Initial issue list

### 1.1 Translation issues

| Location | Issue | Example |
|----------|--------|---------|
| **Inbox – conversation list** | Status badges shown in English only | `New`, `Booked`, `In Progress` |
| **Inbox – chat header** | "Scanning (N)" hardcoded | Bot flow scanning badge |
| **Inbox – AI suggestion** | "Recommend: Start …?", "Dismiss", "Use Flow", "Auto-detected keyword…" hardcoded | Suggestion overlay |
| **Inbox – debug** | "DEBUG: Match Found" hardcoded | Dev badge |
| **Inbox – message types** | "Location", "Download", "Open in Maps", "Click to view location…", "Document" hardcoded | Message bubbles |
| **Inbox – time** | "2 min" next to "Last active" hardcoded | Header subtitle |
| **Inbox Sidebar** | "Group Chat", "Lead Customer" hardcoded | Contact type label |
| **Inbox Sidebar** | "Branch", "Status", "Meta ID" labels hardcoded | Detail section headers |
| **Dates/times** | `date-fns` used without locale | Times like "3:45 PM" not in Arabic locale; `formatDistanceToNow` in English |
| **Notifications (Topbar)** | `toLocaleString()` without locale | Notification timestamp |

### 1.2 RTL / layout issues

| Location | Issue | Fix |
|----------|--------|-----|
| **Root layout** | `<html lang="ar" dir="rtl">` hardcoded | Sync with I18n (default `ar`/`rtl`, update on client when language changes). |
| **Inbox 3-column layout** | Column order is LTR-only | In RTL: List (right) → Chat (center) → Details (left). Use `flex-row-reverse` when `dir === "rtl"` on container. |
| **Inbox – list column** | `border-r` | Use `border-e` (logical end). |
| **Inbox – conversation row** | `border-l-4 border-l-primary` for selected state | Use `border-s-4 border-s-primary` (inline-start). |
| **Inbox – AI suggestion overlay** | `left-4 right-4` | Use `start-4 end-4`. |
| **Inbox – image preview close** | `-right-4` | Use `-end-4`. |
| **Inbox Sidebar** | `border-l` | Use `border-e`. |
| **Dropdowns / popovers** | `align="start"` or `align="end"` | Prefer `align={dir === "rtl" ? "end" : "start"}` where meaning is “from leading edge”. |
| **Message bubbles** | Already use `ms-auto` / `me-auto` | Verify in RTL: sent = end, received = start. |

### 1.3 UX / consistency

| Issue | Note |
|-------|------|
| Single-language experience | No mixing of Arabic and English in the same view; all labels/placeholders/statuses from `t()`. |
| Status terminology | Unify: e.g. `leadStatusNew`, `leadStatusBooked`, `leadStatusInProgress` and use everywhere. |
| Date/time | Use `date-fns` with `ar` locale when `language === "ar"`; Topbar/notifications use `toLocaleString(locale)`. |
| Visual hierarchy | Badge styles and button order already present; ensure RTL doesn’t flip priority (primary actions still clear). |

---

## 2. Fix strategy

### Phase 1 (this PR): Inbox + Sidebar + Topbar

1. **Translations**
   - Add all missing keys to `lib/i18n.tsx` (see §3).
   - Replace every hardcoded string in Inbox page, Inbox Sidebar, and Topbar with `t(key)`.

2. **RTL**
   - Keep root layout default `lang="ar" dir="rtl"` for SSR; I18nProvider already sets `document.documentElement.dir`/`lang` on client.
   - Inbox: 3-column container `dir === "rtl" ? "flex-row-reverse" : "flex-row"`.
   - Replace physical borders: `border-l`/`border-r` → `border-s`/`border-e` where appropriate; selected row `border-l-4` → `border-s-4`.
   - Replace physical insets: `left-4 right-4` → `start-4 end-4`, `-right-4` → `-end-4`.
   - Inbox Sidebar: `border-l` → `border-e`.

3. **Dates**
   - Use `date-fns` with `ar` locale when `language === "ar"` for `format` and `formatDistanceToNow`.
   - Topbar/notifications: use `toLocaleString(locale)` with `ar-SA` / `en-US`.

4. **Dropdown/popover alignment**
   - Use `dir` to set `align` where the menu should open from the “start” or “end” of the trigger (e.g. filters: start in both LTR/RTL).

### Phase 2 (later PRs)

- Dashboard: same translation + RTL + date rules.
- Remaining pages: audit and replace hardcoded strings; logical CSS.
- Global components: Sheet, Dialog, Select – ensure RTL positioning and logical margins.

### Phase 3

- Before/after screenshots.
- RTL & i18n best-practice doc for future work.

---

## 3. New translation keys (Phase 1)

Added in `lib/i18n.tsx`:

| Key | EN | AR |
|-----|----|----|
| `leadStatusNew` | New | جديد |
| `leadStatusBooked` | Booked | محجوز |
| `leadStatusInProgress` | In Progress | قيد التنفيذ |
| `scanningCount` | Scanning ({n}) | جاري المسح ({n}) |
| `recommendStartFlow` | Recommend: Start "{name}"? | التوصية: بدء "{name}"؟ |
| `autoDetectedTrigger` | Auto-detected keyword matching trigger: "{trigger}" | تطابق تلقائي للمحفز: "{trigger}" |
| `dismiss` | Dismiss | تجاهل |
| `useFlow` | Use Flow | استخدام السير |
| `groupChat` | Group Chat | دردشة جماعية |
| `leadCustomer` | Lead Customer | عميل محتمل |
| `branchLabel` | Branch | الفرع |
| `statusLabel` | Status | الحالة |
| `metaId` | Meta ID | معرّف Meta |
| `locationLabel` | Location | الموقع |
| `downloadLabel` | Download | تنزيل |
| `openInMaps` | Open in Maps | فتح في الخرائط |
| `clickToViewInMaps` | Click to view location in Google Maps | انقر لعرض الموقع في خرائط Google |
| `documentLabel` | Document | مستند |
| `minutesAgo` | {n} min | منذ {n} د |
| `debugMatchFound` | DEBUG: Match Found ({name}) | تصحيح: تطابق ({name}) |

(Keys that need interpolation use `{n}` or `{name}`/`{trigger}`; implement in `t()` or inline replace.)

---

## 4. Acceptance criteria (Phase 1)

- [ ] Arabic users see no unintended English in Inbox, Sidebar, or Topbar.
- [ ] Status badges show translated text (جديد / محجوز / قيد التنفيذ) when locale is Arabic.
- [ ] RTL: Inbox column order is List (right) → Chat (center) → Details (left).
- [ ] RTL: Borders and spacing use logical properties; no “broken” alignment.
- [ ] Dates and times respect locale (Arabic when language is Arabic).
- [ ] Single-language experience: no mixing of Arabic and English in the same component.

---

## 5. File change summary (first PR)

| File | Changes |
|------|---------|
| `docs/RTL-Translation-Audit-Report.md` | New – this report. |
| `lib/i18n.tsx` | New translation keys; optional `t(key, params)` for interpolation. |
| `app/layout.tsx` | Keep default `lang="ar" dir="rtl"`; optional comment that I18nProvider syncs on client. |
| `app/inbox/page.tsx` | RTL column order; logical borders/insets; all strings via `t()`; date-fns with `ar` locale. |
| `app/inbox/Sidebar.tsx` | Logical border; all labels via `t()`. |
| `components/top-bar.tsx` | Notification date locale (already has `language`). |

---

## 6. RTL & i18n recommendations for future work

1. **Always use logical properties:** `margin-inline-start`, `padding-inline-end`, or Tailwind `ms-*`, `me-*`, `ps-*`, `pe-*`, `border-s`, `border-e`, `start-*`, `end-*`.
2. **No physical direction in layout:** Avoid `left`/`right`/`ml`/`mr`/`pl`/`pr`/`border-l`/`border-r` unless intentional (e.g. a decorative bar).
3. **One language per view:** Every user-facing string from `t()`; no hardcoded English in Arabic locale and vice versa.
4. **Status and enums:** Define a small set of keys (e.g. `leadStatusNew`) and use consistently; avoid displaying API enum values directly.
5. **Dates:** Use `date-fns` with `import { ar } from 'date-fns/locale'` when `language === "ar"`; for `toLocaleString` always pass `locale` (e.g. `ar-SA`, `en-US`).
6. **Dropdowns/popovers:** Prefer `align={dir === "rtl" ? "end" : "start"}` for “from leading edge” so they open correctly in RTL.

---

## 7. Chat RTL bubble logic (execution summary)

**Implemented:** Chat column, message list, bubbles, and input bar are RTL-safe.

### Container
- The chat column has `dir={dir}` so when locale is Arabic the whole column is RTL.
- Flow is top → bottom; content aligned to **start** (right in RTL) via `.chat-column { text-align: start }`.

### Message alignment (logical only)
- **Incoming:** Bubble on the **start** side (right in RTL). Achieved with `margin-inline-end: auto` on `.chat-bubble-wrap` (no `margin-inline-start`), so the bubble stays at the start edge.
- **Outgoing:** Bubble on the **end** side (left in RTL). Achieved with `margin-inline-start: auto` and `margin-inline-end: 0` on the wrap.
- No physical `left`/`right`; no centering. Row is `display: flex` with one child; the child’s margin does the alignment.

### Bubble tail (radius)
- **Incoming:** Flat corner at **start-bottom** so the “tail” points to the start edge: `border-end-start-radius: 0` (`.chat-bubble.incoming`).
- **Outgoing:** Flat corner at **end-bottom**: `border-end-end-radius: 0` (`.chat-bubble.outgoing`).
- Same logic works in both LTR and RTL because “start” and “end” flip with direction.

### Timestamp and checkmarks
- Meta row under the bubble uses `.chat-bubble-meta` with `flex` and `gap`.
- For **outgoing**, `.chat-bubble-wrap.outgoing .chat-bubble-meta { flex-direction: row-reverse }` so in RTL the checkmarks (✓✓) appear to the **left** of the time (start side).
- DOM order is `[time, checkmarks]`; row-reverse makes it read as checkmarks then time in RTL.

### Input bar
- Container has `.chat-input-bar`; in RTL `[dir="rtl"] .chat-input-bar { flex-direction: row-reverse }`.
- Visual order in RTL: **Send** (start) | Input | Mic | Emoji | **Attach** (end) — i.e. [ Attach | Emoji | Mic ] → Input → Send with Send on the left.
- Input has `dir={dir}` and `text-align: start`; placeholder is translated.

### Scroll
- Messages container scrolls with a sentinel at the bottom; `scrollIntoView({ behavior: "smooth" })` runs when `messages.length` or `selectedConversation?.id` changes so the view stays at the latest message.
