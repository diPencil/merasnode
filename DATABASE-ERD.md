# 📊 مخطط قاعدة بيانات Meras CRM - ERD

## 🎯 Entity Relationship Diagram

```mermaid
erDiagram
    %% المستخدمين والصلاحيات
    User ||--o{ Conversation : "manages"
    User ||--o{ Message : "sends"
    User ||--o{ Log : "creates"
    User ||--o{ Notification : "receives"
    User ||--o{ Booking : "handles"
    User ||--o{ Note : "creates"
    User }o--o{ Branch : "assigned_to"
    User }o--o{ WhatsAppAccount : "uses"

    %% جهات الاتصال
    Contact ||--o{ Conversation : "has"
    Contact ||--o{ Invoice : "receives"
    Contact ||--o{ Booking : "makes"
    Contact ||--o{ Note : "has"
    Contact }o--|| Branch : "belongs_to"

    %% المحادثات والرسائل
    Conversation ||--o{ Message : "contains"
    
    %% WhatsApp
    WhatsAppAccount ||--o{ Message : "sends/receives"
    WhatsAppAccount }o--|| Branch : "belongs_to"

    %% الفروع
    Branch ||--o{ Contact : "manages"
    Branch ||--o{ WhatsAppAccount : "has"
    Branch }o--o{ User : "employs"

    %% الجداول المستقلة
    Template
    BotFlow
    Settings
    Offer
    ApiKey
    CrmIntegration

    %% تعريف الجداول
    User {
        string id PK
        string email UK
        string password
        string name
        enum role
        enum status
        boolean isActive
        datetime lastLoginAt
        datetime lastLogoutAt
        datetime createdAt
        datetime updatedAt
    }

    Contact {
        string id PK
        string name
        string phone UK
        string email
        json tags
        text notes
        datetime followUpDate
        string branchId FK
        datetime createdAt
        datetime updatedAt
    }

    Conversation {
        string id PK
        string contactId FK
        string assignedToId FK
        enum status
        boolean isRead
        boolean isArchived
        boolean isBlocked
        datetime lastMessageAt
        datetime createdAt
        datetime updatedAt
    }

    Message {
        string id PK
        string conversationId FK
        string senderId FK
        string whatsappAccountId FK
        text content
        enum type
        enum direction
        enum status
        string mediaUrl
        datetime createdAt
    }

    WhatsAppAccount {
        string id PK
        string name
        string phone UK
        string provider
        enum status
        text qrCode
        json sessionData
        string branchId FK
        datetime createdAt
        datetime updatedAt
    }

    Branch {
        string id PK
        string name
        string address
        string phone
        string email
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    Invoice {
        string id PK
        string invoiceNumber UK
        string contactId FK
        float amount
        string currency
        enum status
        json items
        datetime dueDate
        datetime paidAt
        text notes
        datetime createdAt
        datetime updatedAt
    }

    Booking {
        string id PK
        string bookingNumber UK
        string contactId FK
        string agentId FK
        string branch
        enum status
        datetime date
        text notes
        datetime createdAt
        datetime updatedAt
    }

    Note {
        string id PK
        text content
        string contactId FK
        string createdBy FK
        datetime createdAt
        datetime updatedAt
    }

    Template {
        string id PK
        string name
        text content
        string category
        string language
        enum status
        datetime createdAt
        datetime updatedAt
    }

    BotFlow {
        string id PK
        string name
        text description
        string trigger
        json steps
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    Log {
        string id PK
        string userId FK
        string action
        string entityType
        string entityId
        string ipAddress
        text userAgent
        json metadata
        datetime createdAt
    }

    Notification {
        string id PK
        string userId FK
        string title
        text message
        enum type
        boolean isRead
        string link
        datetime createdAt
    }

    Settings {
        string id PK
        string companyName
        string timezone
        string language
        boolean newMessagesNotif
        boolean assignmentNotif
        boolean templateNotif
        boolean dailySummaryNotif
        boolean twoFactorEnabled
        datetime createdAt
        datetime updatedAt
    }

    Offer {
        string id PK
        string title
        text description
        text content
        datetime validFrom
        datetime validTo
        boolean isActive
        json targetAudience
        datetime createdAt
        datetime updatedAt
    }

    ApiKey {
        string id PK
        string name
        string key UK
        boolean isActive
        datetime lastUsedAt
        datetime createdAt
        datetime expiresAt
    }

    CrmIntegration {
        string id PK
        string provider
        string apiKey
        string apiSecret
        boolean isActive
        datetime lastSyncAt
        datetime createdAt
        datetime updatedAt
    }
```

---

## 🔗 العلاقات الرئيسية

### 1️⃣ دورة المحادثة (Conversation Flow)

```mermaid
graph LR
    A[Contact] -->|creates| B[Conversation]
    B -->|assigned to| C[User/Agent]
    B -->|contains| D[Messages]
    E[WhatsAppAccount] -->|sends/receives| D
    C -->|sends| D
```

**الشرح**: 
- العميل (`Contact`) ينشئ محادثة
- المحادثة تُسند لوكيل (`User`)
- الرسائل تُرسل عبر حساب واتساب (`WhatsAppAccount`)

---

### 2️⃣ إدارة جهات الاتصال (Contact Management)

```mermaid
graph TD
    A[Contact] -->|has| B[Conversations]
    A -->|has| C[Invoices]
    A -->|has| D[Bookings]
    A -->|has| E[Notes]
    A -->|belongs to| F[Branch]
```

**الشرح**:
- كل عميل يمكن أن يكون له:
  - محادثات متعددة
  - فواتير
  - حجوزات
  - ملاحظات داخلية
- العميل مرتبط بفرع محدد

---

### 3️⃣ البنية التنظيمية (Organization Structure)

```mermaid
graph TD
    A[Branch] -->|has| B[Users]
    A -->|has| C[WhatsApp Accounts]
    A -->|manages| D[Contacts]
    B -->|uses| C
    B -->|handles| E[Conversations]
```

**الشرح**:
- كل فرع له موظفين وحسابات واتساب خاصة
- الموظفون يستخدمون حسابات الواتساب لإدارة المحادثات

---

## 📈 إحصائيات قاعدة البيانات

| النوع | العدد | الوصف |
|------|------|-------|
| **الجداول الرئيسية** | 8 | User, Contact, Conversation, Message, WhatsAppAccount, Branch, Invoice, Booking |
| **الجداول المساعدة** | 7 | Note, Template, BotFlow, Log, Notification, Settings, Offer |
| **جداول التكامل** | 2 | ApiKey, CrmIntegration |
| **إجمالي الجداول** | 17 | - |
| **العلاقات (Relations)** | 23 | One-to-Many & Many-to-Many |
| **الفهارس (Indexes)** | 18 | لتحسين الأداء |

---

## 🎨 العلاقات حسب النوع

### One-to-Many (1:N)

```
User          → Messages (1 user → many messages)
User          → Conversations (1 user → many conversations)
User          → Notifications (1 user → many notifications)
Contact       → Conversations (1 contact → many conversations)
Contact       → Invoices (1 contact → many invoices)
Contact       → Bookings (1 contact → many bookings)
Conversation  → Messages (1 conversation → many messages)
Branch        → Contacts (1 branch → many contacts)
Branch        → WhatsAppAccounts (1 branch → many accounts)
```

### Many-to-Many (N:M)

```
User ←→ Branch (user can work in multiple branches)
User ←→ WhatsAppAccount (user can use multiple accounts)
```

---

## 🔍 نقاط الوصول الرئيسية (Key Access Patterns)

### 1. جلب محادثات صندوق الوارد

```typescript
// الاستعلام الأكثر استخداماً
Contact → Conversation → Message → User (assigned agent)
```

**الفهارس المستخدمة**:
- `Conversation.contactId` ✅
- `Conversation.assignedToId` ✅
- `Message.conversationId` ✅

---

### 2. تتبع رسائل حساب واتساب

```typescript
WhatsAppAccount → Message → Conversation → Contact
```

**الفهارس المستخدمة**:
- `Message.whatsappAccountId` ✅
- `Message.conversationId` ✅

---

### 3. تقارير الفروع

```typescript
Branch → Users → Conversations → Messages
Branch → WhatsAppAccounts → Messages
Branch → Contacts
```

**الفهارس المستخدمة**:
- `WhatsAppAccount.branchId` ✅
- `Contact.branchId` (مطلوب إضافته) ⚠️

---

## 💡 توصيات التحسين

### 1. إضافة فهارس مفقودة

```sql
-- Contact.branchId للفلترة حسب الفرع
CREATE INDEX idx_contact_branch ON Contact(branchId);

-- Message.createdAt للترتيب الزمني
CREATE INDEX idx_message_created ON Message(createdAt);

-- Conversation.lastMessageAt للترتيب
CREATE INDEX idx_conversation_last_message ON Conversation(lastMessageAt);
```

### 2. Soft Delete بدلاً من Hard Delete

```prisma
model Contact {
  // ...
  deletedAt DateTime?
  
  @@index([deletedAt]) // للفلترة السريعة
}
```

### 3. Partitioning للجداول الكبيرة

```sql
-- تقسيم جدول Message حسب الشهر
PARTITION BY RANGE (YEAR(createdAt) * 100 + MONTH(createdAt))
```

---

## 🚀 سيناريوهات الاستخدام

### سيناريو 1: وكيل يفتح محادثة

```
1. User logs in → check User.isActive
2. Load assigned conversations → Conversation (assignedToId = userId)
3. Display conversation list → include Contact, last Message
4. User opens conversation → load all Messages
5. User sends reply → create new Message (direction: OUTGOING)
6. Update Conversation.lastMessageAt
```

### سيناريو 2: رسالة واتساب جديدة واردة

```
1. WhatsApp webhook → identify WhatsAppAccount by phone
2. Find or create Contact → by phone number
3. Find or create Conversation → by contactId
4. Create Message → (direction: INCOMING)
5. Update Conversation (isRead: false, lastMessageAt)
6. Create Notification → for assigned User
7. Run BotFlow → if trigger matches
```

### سيناريو 3: إنشاء فاتورة لعميل

```
1. Find Contact → by phone or name
2. Create Invoice → link to contactId
3. Send invoice via WhatsApp → create Message with DOCUMENT
4. Create Notification → notify assigned agent
5. Log action → create Log entry
```

---

## 📝 ملاحظات مهمة

1. **UUID vs Auto-increment**:
   - جميع الجداول تستخدم UUID للـ Primary Key
   - يساعد في التوزيع والدمج المستقبلي

2. **Cascade Delete**:
   - `Contact → Conversation → Message` (cascade)
   - `Contact → Invoice` (cascade)
   - `Contact → Booking` (cascade)
   - حذف العميل يحذف كل بياناته المرتبطة

3. **Soft Relations**:
   - `User → Conversation` (onDelete: SetNull)
   - `User → Message` (onDelete: SetNull)
   - حذف المستخدم لا يحذف البيانات، فقط يفك الارتباط

4. **JSON Fields**:
   - `Contact.tags` → مصفوفة وسوم مرنة
   - `BotFlow.steps` → خطوات السير الآلي
   - `Invoice.items` → بنود الفاتورة
   - `Settings.*` → إعدادات مرنة

---

## 🎯 خريطة التدفق الكاملة

```mermaid
flowchart TB
    subgraph "إدارة المستخدمين"
        U[User]
        B[Branch]
        U -.->|works in| B
    end

    subgraph "إدارة العملاء"
        C[Contact]
        N[Note]
        C -->|has| N
    end

    subgraph "المحادثات والرسائل"
        CV[Conversation]
        M[Message]
        W[WhatsAppAccount]
        CV -->|contains| M
        W -->|sends| M
        U -->|sends| M
    end

    subgraph "المبيعات والحجوزات"
        I[Invoice]
        BK[Booking]
    end

    subgraph "الأتمتة"
        T[Template]
        BF[BotFlow]
    end

    subgraph "النظام"
        L[Log]
        NT[Notification]
        S[Settings]
    end

    C -->|creates| CV
    U -->|manages| CV
    C -->|receives| I
    C -->|makes| BK
    U -->|handles| BK
    U -->|creates| L
    U -->|receives| NT
    B -->|has| W
    B -->|manages| C

    style U fill:#e1f5ff
    style C fill:#fff4e1
    style CV fill:#e8f5e9
    style M fill:#e8f5e9
    style W fill:#f3e5f5
    style B fill:#fce4ec
```

---

**تم الإنشاء بتاريخ**: 18 يناير 2026  
**الإصدار**: 1.0  
**قاعدة البيانات**: MySQL with Prisma ORM

---

## 📖 كيفية عرض المخطط

### في GitHub / GitLab
الملف سيُعرض تلقائياً مع Mermaid rendering

### في VS Code
1. تثبيت إضافة: `Markdown Preview Mermaid Support`
2. فتح الملف والضغط `Ctrl+Shift+V` للمعاينة

### في أدوات أخرى
- نسخ كود Mermaid في [mermaid.live](https://mermaid.live/)
- استخدام [draw.io](https://app.diagrams.net/) لتحويله لـ PNG/SVG

---

## 🔗 مراجع

- [Prisma Schema](./prisma/schema.prisma)
- [Database Schema Docs](./DATABASE-SCHEMA.md)
- [API Documentation](./API-DOCUMENTATION.md)
