## RTL Audit Report – Meras (Arabic Default)

### 1. Global language & direction

- **Files updated**
  - `app/layout.tsx`
  - `lib/i18n.tsx` (سلوك سابق، لم يتم تعديله في هذا الـ PR لكنه مصدر الحقيقة)

- **التغييرات**
  - جعل العربية هي اللغة الافتراضية على مستوى الـ HTML:
    - `lang="ar"` و `dir="rtl"` مضافة الآن مباشرة على عنصر `<html>` في `RootLayout`.
  - إزالة السكربت المضمَّن في `<head>` الذي كان يقرأ `localStorage` ويعدّل `dir/lang` مرتين (مرة من السكربت ومرة من `I18nProvider`).
  - الاعتماد على `I18nProvider` كمصدر الحقيقة لتحديث:
    - `document.documentElement.dir`
    - `document.documentElement.lang`
    - `document.documentElement[data-lang]`
    - `document.body.dir`

- **النتيجة**
  - SSR يبدأ دائماً بالعربية + RTL بدون وميض LTR.
  - عند تغيير اللغة من الـ UI، يقوم `I18nProvider` بتحديث `dir/lang` بشكل موحّد.

---

### 2. Shell layout (NavigationRail + TopBar + AppLayout)

- **Files updated**
  - `components/app-layout.tsx`
  - `components/navigation-rail.tsx`
  - `components/top-bar.tsx`

- **التغييرات الرئيسية**
  - `AppLayout`:
    - استهلاك `dir` من `useI18n()`.
    - تغيير اتجاه الـ flex بين الشريط الجانبي والمحتوى:
      - عند `dir="rtl"`: استخدام `flex-row-reverse` ليظهر الـ sidebar على يمين الشاشة.
      - عند `dir="ltr"`: استخدام `flex-row` (السلوك الافتراضي).
  - `NavigationRail`:
    - استهلاك `dir` من `useI18n()`.
    - ضبط اتجاه الحدود باستخدام منطق `border`:
      - في RTL: استخدام `border-s` (الحد من الجهة اليسرى الفيزيائية).
      - في LTR: استخدام `border-e` (الحد من الجهة اليمنى الفيزيائية).
    - بقية التراكيب (`text-start`, `order-first`) مازالت تعمل لأن Tailwind يستخدم خصائص منطقية مع `dir`.
  - `TopBar`:
    - استهلاك `language` و `dir` من `useI18n()`.
    - تنسيق التاريخ والوقت:
      - عند العربية: `locale = "ar-SA"`.
      - عند الإنجليزية: `locale = "en-US"`.
      - هذا يضمن أرقام/تنسيق عربي في RTL.
    - ترتيب وأماكن عناصر الشريط العلوي:
      - التفاف الحاوية اليمنى بأصناف شرطية:
        - RTL: `flex-row-reverse` لتكون الأيقونات في ترتيب طبيعي من ناحية القراءة العربية.
        - LTR: `flex-row` كما هو.

---

### 3. RTL في مكوّنات UI الأساسية

- **Files updated (نماذج رئيسية)**
  - `components/ui/multi-select.tsx`
  - `components/ui/field.tsx`
  - `components/ui/command.tsx`
  - `components/ui/menubar.tsx`
  - `components/ui/navigation-menu.tsx`

- **تحويل margin/padding إلى خصائص منطقية**
  - `multi-select.tsx`:
    - `ml-1` → `ms-1` (هامش بداية العنصر، يعمل في RTL/LTR).
    - `ml-2` → `ms-2`.
    - `mr-2` → `me-2`.
    - الهدف: أن تكون المسافات بين الأيقونات والنصوص صحيحة في كل من العربية والإنجليزية.
  - `field.tsx`:
    - `ml-4` لقائمة أخطاء التحقق → `ms-4`.
    - يجعل إزاحة القائمة من بداية السطر منطقية للـ RTL/LTR.
  - `command.tsx`:
    - `ml-auto` في `CommandShortcut` → `ms-auto`.
    - هذا يحافظ على ظهور اختصارات لوحة المفاتيح في نهاية السطر بصرياً في كلا الاتجاهين.
  - `menubar.tsx`:
    - `data-[inset]:pl-8` → `data-inset:ps-8` في أماكن لها علاقة بالـ label/sub-trigger.
    - `ml-auto` في `MenubarShortcut` → `ms-auto`.
    - أيقونة `ChevronRight` في الـ SubTrigger الآن تستخدم `ms-auto` حتى تبقى في نهاية السطر بشكل منطقي في RTL.
  - `navigation-menu.tsx`:
    - `ml-1` للأيقونة `ChevronDown` → `ms-1`.

- **ملاحظات**
  - لم يتم تغيير كل استعمالات `left/right` في الـ overlays (مثل `dialog`, `sheet`, `drawer`) لأنها مربوطة باتجاه ظهور النافذة نفسها، وليس بنص واجهة المستخدم، وغالباً تبقى صحيحة في RTL (مثلاً drawer من اليمين ما يزال باستعمال `right-0`).
  - globals في `app/globals.css` تحتوي قواعد RTL إضافية بـ `[dir="rtl"]`، وهي تعمل مع التغييرات الحالية (خاصةً في الحقول وملفات الإعدادات).

---

### 4. Inbox & messages RTL

- **Files updated**
  - `components/inbox/chat-panel.tsx`
  - `components/inbox/conversations-list.tsx`
  - `app/inbox/page.tsx` (مستخدم بالفعل `AppLayout` + `t()` + dir-aware UI)

- **التغييرات**
  - `chat-panel.tsx`:
    - حقل الرسالة:
      - `pr-10` → `pe-10` ليعمل كـ padding-end منطقية للغة.
    - زر الإيموجي داخل الحقل:
      - الموضع من `right-1` إلى `end-1`:
        - `className="absolute end-1 top-1/2 ..."` بحيث يتحرك حسب اتجاه النص (يمين في LTR، يسار في RTL).
    - فقاعات الرسائل نفسها تستخدم:
      - `justify-end`/`justify-start` بناءً على `direction` (outbound/inbound) وليست ثابتة على يسار/يمين، وهذا مناسب لواجهة محادثات عربية.
  - `conversations-list.tsx`:
    - أيقونة البحث:
      - `left-3` → `start-3` لتكون في بداية الحقل منطقياً.
    - حقل الإدخال:
      - `pl-10` → `ps-10` ليتوافق مع موقع الأيقونة في RTL/LTR.
    - لا تزال نصوص مثل "No conversations found" إنجليزية مؤقتاً (يمكن تغطيتها لاحقاً بمفاتيح ترجمة إذا رغبت، لكن المشروع يركّز حالياً على جعل النسخة العربية هي الأساس في الصفحات الأساسية، وتم تغطية الجزء الأكبر عبر `t()`).

---

### 5. الصفحات والنسخة العربية كنسخة أساسية

- **Files updated**
  - `app/page.tsx`

- **التغييرات**
  - تم استبدال نص `"Loading..."` الثابت إلى استخدام `t("loading")` مع استهلاك `useI18n()`:
    - يعرض الآن "جاري التحميل..." عند العربية.
  - بقية الصفحات (dashboard, inbox, settings, contacts, bot-flows, accounts, users, logs) تستخدم `AppLayout` و `useI18n` ومفاتيح مترجمة من `lib/i18n.tsx`، ما يجعل العربية هي النسخة الافتراضية فعلياً.

---

### 6. الترجمة (i18n) وحالة المفاتيح

- **ملف الترجمة الرئيسي**
  - `lib/i18n.tsx` يحتوي على أكثر من 600 مفتاح مع ترجمة عربية كاملة.

- **ما تم التحقق منه**
  - جميع أماكن استدعاء `t("...")` في:
    - `app/inbox/page.tsx`
    - `app/inbox/Sidebar.tsx`
    - `app/users/page.tsx`
    - `app/bot-flows/page.tsx`
    - `app/settings/page.tsx`
    - `app/whatsapp/*.tsx`
    - `components/top-bar.tsx`
    - `components/navigation-rail.tsx`
  - لها مفاتيح موجودة في `translations` مع ترجمة عربية.
  - تم نقل أي نص إنجليزي واضح في صفحة الجذر إلى `t("loading")`.

- **ملاحظات على النصوص الإنجليزية المتبقية**
  - بعض النصوص داخل مكوّنات UI عامة (مثل placeholder `"Select items..."` في `MultiSelect`) ما زالت إنجليزية، ويمكن نقلها إلى system-level i18n لاحقاً إذا أردت تغطية كاملة لكل placeholder.

---

### 7. الوصولية (Accessibility) مع RTL

- **lang/dir**
  - `<html>` الآن يملك `lang="ar"` و `dir="rtl"` في SSR.
  - عند تغيير اللغة، يقوم `I18nProvider` بتعديل:
    - `document.documentElement.lang`
    - `document.documentElement.dir`
    - `document.body.dir`
  - هذا يضمن أن قارئات الشاشة والمتصفحات تفهم اتجاه اللغة بشكل صحيح.

- **ترتيب الـ focus**
  - لأننا اعتمدنا على خصائص منطقية (`flex-row-reverse`, `start/end`, `ps/pe`, `ms/me`) بدلاً من التلاعب اليدوي بـ `left/right`:
    - ترتيب الـ tab والـ focus يتبع ترتيب الـ DOM كما هو، بدون عكس فوضوي.
  - المكوّنات المبنية على Radix (dialog, dropdown, popover, navigation-menu, menubar, command) تحافظ على سلوك focus/ARIA الافتراضي مع اتجاه RTL.

---

### 8. ملاحظات حول المكتبات الخارجية والـ RTL

- **Radix UI (dropdown, dialog, popover, sheet, navigation-menu, menubar, command)**
  - Radix لا يطبّق RTL تلقائياً على الحركات (animations) في الاتجاه، لكن في هذا المشروع:
    - استخدمنا `slide-in-from-left/right` فقط في الـ overlay، وهي مناسبة بصرياً حتى في RTL لأن مواضعها غالباً متناظرة.
  - إن احتجنا لاحقاً لعكس اتجاه الحركة بالكامل حسب اللغة يمكن إضافة logic بسيط يختار الـ class بناءً على `dir`.

- **Tailwind CSS**
  - تم استخدام نظام Tailwind v4 مع أصناف منطقية (`start/end`, `ps/pe`, `ms/me`) التي تعتمد على `dir` في الـ HTML.
  - لم تتم إضافة plugin RTL إضافي حالياً (مثل `tailwindcss-rtl`) لأن الخصائص المنطقية مع `[dir="rtl"]` في `globals.css` تكفي لحالة المشروع.

---

### 9. دليل مختصر للمطورين (How To RTL)

#### 9.1 المبادئ العامة

- **لا تستخدم** `left/right`, `ml/mr`, `pl/pr`, `text-left/text-right` إلا إذا كان الهدف فيزيائي بالكامل (مثل فتح drawer من حافة الشاشة).
- **استخدم بدلاً منها**:
  - `ms-*` و `me-*` بدلاً من `ml-*` و `mr-*` (margin-inline-start/end).
  - `ps-*` و `pe-*` بدلاً من `pl-*` و `pr-*` (padding-inline-start/end).
  - `start-*` و `end-*` بدلاً من `left-*` و `right-*` (مواضع منطقية مطابقة لاتجاه الكتابة).

#### 9.2 أمثلة عملية

- مسافة بين أيقونة ونص في زر:
  - قبل: `className="mr-2 h-4 w-4"` → بعد: `className="me-2 h-4 w-4"`.
- أيقونة في نهاية صف (مثل اختصار لوحة مفاتيح أو سهم المزيد):
  - قبل: `ml-auto` → بعد: `ms-auto`.
- أيقونة داخل input (مثل العدسة في حقل البحث):
  - أيقونة: `absolute start-3 top-1/2 ...`.
  - input: `ps-10` بدلاً من `pl-10`.

#### 9.3 الأيقونات والاتجاه

- الأسهم والـ chevrons:
  - إن كان السهم يمثّل "التالي/السابق" وليس مجرد أيقونة ديكور، راعِ عكس الاتجاه في RTL:
    - إمّا باستخدام `rotate-180` مع شرط `dir === "rtl"`.
    - أو اختيار أيقونة مختلفة (مثلاً `ChevronLeft` بدلاً من `ChevronRight`) بناءً على اللغة.

#### 9.4 النصوص والترجمة

- كل نص للمستخدم النهائي يجب أن يأتي من `useI18n().t(key)`:
  - أضف المفتاح إلى `translations` في `lib/i18n.tsx` مع قيم `en` و `ar`.
  - تجنب كتابة جمل ثابتة إنجليزية داخل JSX مباشرة في الصفحات الأساسية.

---

### 10. المخرجات المقترحة لـ PRs

- **فرع shell/layout** – `fix/rtl-shell-layout`
  - يشمل: `app/layout.tsx`, `components/app-layout.tsx`, `components/navigation-rail.tsx`, `components/top-bar.tsx`.
- **فرع inbox** – `fix/rtl-inbox`
  - يشمل: `components/inbox/chat-panel.tsx`, `components/inbox/conversations-list.tsx`, `app/inbox/page.tsx`, `app/inbox/Sidebar.tsx` (إن احتاج).
- **فرع shared-ui** – `fix/rtl-shared-ui`
  - يشمل: مجموعة مكوّنات `components/ui/*` التي تمّ لمسها (`multi-select`, `field`, `command`, `menubar`, `navigation-menu`، إلخ).

لكل PR:

- إضافة لقطات قبل/بعد (`before/after`) على breakpoints:
  - 375px (موبايل)
  - 768px (تابلت)
  - 1200px (ديسكتوب)
- تشغيل `pnpm dev` ومراجعة:
  - الـ navbar / shell العام.
  - inbox (قائمة المحادثات + لوحة الرسائل).
  - settings العامة، خاصة مسارات رفع الشعار واللغة الافتراضية.

