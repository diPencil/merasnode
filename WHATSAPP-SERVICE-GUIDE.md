# 🤖 دليل شامل لخدمة WhatsApp - شرح مبسط

## 📖 فهرس المحتويات

1. [ما هي خدمة WhatsApp؟](#ما-هي-خدمة-whatsapp)
2. [كيف تعمل؟](#كيف-تعمل)
3. [Multi-Client Manager](#multi-client-manager)
4. [دورة حياة الحساب](#دورة-حياة-الحساب)
5. [أمثلة عملية مع الكود](#أمثلة-عملية-مع-الكود)
6. [معالجة الأخطاء](#معالجة-الأخطاء)
7. [Best Practices](#best-practices)

---

## 🎯 ما هي خدمة WhatsApp؟

### التعريف البسيط

**خدمة WhatsApp** هي تطبيق Node.js مستقل يعمل بجانب تطبيق Next.js الرئيسي. وظيفتها الوحيدة هي:

- 📤 **إرسال** رسائل WhatsApp
- 📥 **استقبال** رسائل WhatsApp
- 🔄 **إدارة** حسابات WhatsApp متعددة

### لماذا خدمة منفصلة؟

```
❌ السيناريو السيئ:
Next.js يتعامل مع WhatsApp مباشرة
  → يستهلك موارد كثيرة
  → يبطئ التطبيق الرئيسي
  → صعوبة إعادة التشغيل

✅ السيناريو الجيد:
Next.js → يطلب من WhatsApp Service → الخدمة تتولى كل شيء
  → موارد منفصلة
  → لا تؤثر على التطبيق الرئيسي
  → سهولة إعادة التشغيل والصيانة
```

---

## 🔧 كيف تعمل؟

### المكونات الأساسية

```javascript
whatsapp-service/
├── server-multi.js              // 🖥️ الخادم (Express Server)
├── multi-client-manager.js      // 🧠 المدير الذكي للحسابات
└── package.json                 // 📦 التبعيات
```

### التبعيات (Dependencies)

#### 1. **whatsapp-web.js**

```javascript
const { Client, LocalAuth } = require('whatsapp-web.js');
```

- هذه هي المكتبة السحرية! 🪄
- تحاكي WhatsApp Web في المتصفح
- تستخدم **Puppeteer** لتشغيل متصفح Chromium في الخلفية

**كيف تعمل؟**
```
1. تفتح متصفح Chromium (headless - بدون واجهة)
2. تفتح WhatsApp Web (web.whatsapp.com)
3. تقوم بكل ما يقوم به WhatsApp Web العادي
4. تعرض QR Code للمسح
5. بعد المسح، تحفظ الجلسة (session)
6. الآن يمكنك إرسال واستقبال الرسائل برمجياً!
```

#### 2. **Express**

```javascript
const express = require('express');
const app = express();
```

- خادم HTTP بسيط
- يستقبل الطلبات من Next.js
- ينفذها على WhatsApp Web.js

#### 3. **QRCode**

```javascript
const qrcode = require('qrcode');
```

- يحول نص QR إلى صورة
- حتى نعرضها في الواجهة الأمامية

---

## 🎮 سير العمل الكامل - مثال حي

### السيناريو: ربط حساب واتساب جديد

#### **الخطوة 1: المدير يطلب ربط حساب**

```javascript
// في الـ Frontend (React)
const connectWhatsApp = async () => {
  const accountId = "meras-riyadh-001";
  
  const response = await fetch('http://localhost:3001/initialize/meras-riyadh-001', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: "966501234567",  // اختياري، للمرجعية فقط
      force: false            // false = عادي، true = حذف الجلسة القديمة
    })
  });
  
  console.log(await response.json());
  // { success: true, message: "Account initialization started", status: "INITIALIZING" }
}
```

---

#### **الخطوة 2: WhatsApp Service يبدأ التهيئة**

```javascript
// في server-multi.js
app.post('/initialize/:accountId', async (req, res) => {
  const { accountId } = req.params;
  const { phone, force } = req.body;
  
  // استدعاء Multi-Client Manager
  const clientData = await manager.initializeClient(accountId, phone);
  
  res.json({
    success: true,
    message: `Account ${accountId} initialization started`,
    status: clientData.status
  });
});
```

---

#### **الخطوة 3: Multi-Client Manager ينشئ عميل جديد**

```javascript
// في multi-client-manager.js
async initializeClient(accountId, phone) {
  console.log(`🔄 Initializing client for account: ${accountId}`);
  
  // إنشاء WhatsApp Client
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: accountId  // ← كل حساب له جلسة خاصة!
    }),
    puppeteer: {
      headless: true,  // بدون واجهة
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    }
  });
  
  // تخزين بيانات العميل
  const clientData = {
    client,
    accountId,
    phone,
    isReady: false,
    qrCode: null,
    status: 'INITIALIZING',
    connectedPhone: null
  };
  
  this.clients.set(accountId, clientData);  // ← حفظ في Map
  
  // إعداد معالجات الأحداث
  this.setupClientEvents(accountId, client, clientData);
  
  // تهيئة العميل
  await client.initialize();
  
  return clientData;
}
```

**ماذا يحدث الآن؟**

```
1. يفتح Puppeteer متصفح Chromium في الخلفية
2. يفتح WhatsApp Web (web.whatsapp.com)
3. ينتظر إما:
   - أن يكون هناك session محفوظة (Login تلقائي)
   - أو يطلب QR Code جديد
```

---

#### **الخطوة 4: WhatsApp Web يطلب QR Code**

```javascript
// في setupClientEvents()
client.on('qr', (qr) => {
  console.log(`📱 QR Code generated for ${accountId}`);
  
  // تحديث بيانات العميل
  clientData.qrCode = qr;
  clientData.status = 'QR_GENERATED';
  
  // إرسال حدث
  this.emit('qr', { accountId, qr });
  
  // إرسال إلى Next.js لتحديث قاعدة البيانات
  fetch(`${this.nextAppUrl}/api/whatsapp/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountId,
      status: 'WAITING',
      qrCode: qr
    })
  });
});
```

**الآن لدينا QR Code جاهز! 📱**

---

#### **الخطوة 5: Frontend يطلب QR Code**

```javascript
// في React Component
const [qrCode, setQrCode] = useState(null);
const [status, setStatus] = useState('INITIALIZING');

// Poll كل ثانيتين
useEffect(() => {
  const interval = setInterval(async () => {
    const response = await fetch(`http://localhost:3001/status/meras-riyadh-001`);
    const data = await response.json();
    
    if (data.qrCode) {
      setQrCode(data.qrCode);  // صورة base64
      setStatus('SCAN_QR');
    }
    
    if (data.isReady) {
      setStatus('CONNECTED');
      clearInterval(interval);
    }
  }, 2000);
  
  return () => clearInterval(interval);
}, []);

// عرض QR Code
return (
  <div>
    {status === 'SCAN_QR' && (
      <div>
        <h3>امسح هذا الرمز بهاتفك</h3>
        <img src={qrCode} alt="QR Code" />
      </div>
    )}
    {status === 'CONNECTED' && (
      <div>✅ متصل بنجاح!</div>
    )}
  </div>
);
```

---

#### **الخطوة 6: المستخدم يمسح QR Code**

```
1. المستخدم يفتح WhatsApp على هاتفه
2. يذهب إلى: الإعدادات → الأجهزة المرتبطة
3. يمسح QR Code
```

---

#### **الخطوة 7: WhatsApp يصادق (Authenticated)**

```javascript
client.on('authenticated', () => {
  console.log(`🔐 Client ${accountId} authenticated`);
  clientData.status = 'AUTHENTICATED';
});
```

---

#### **الخطوة 8: WhatsApp جاهز (Ready)**

```javascript
client.on('ready', async () => {
  console.log(`✅ Client ${accountId} is ready!`);
  
  clientData.isReady = true;
  clientData.status = 'CONNECTED';
  clientData.qrCode = null;  // لا حاجة للـ QR بعد الآن
  
  // الحصول على رقم الهاتف المتصل
  const info = client.info;
  if (info) {
    clientData.connectedPhone = info.wid.user;
    console.log(`📞 Connected phone: ${clientData.connectedPhone}`);
  }
  
  // إرسال إلى Next.js
  await fetch(`${this.nextAppUrl}/api/whatsapp/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountId,
      status: 'CONNECTED',
      phone: clientData.connectedPhone
    })
  });
  
  // إرسال حدث
  this.emit('ready', { accountId, phone: clientData.connectedPhone });
});
```

**الآن الحساب متصل وجاهز! ✅**

---

## 📤 إرسال رسالة - سير العمل الكامل

### السيناريو: وكيل يرد على عميل

#### **الخطوة 1: الوكيل يكتب رد**

```javascript
// في Frontend (Inbox Component)
const sendMessage = async () => {
  const response = await fetch('http://localhost:3000/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId: 'conv-123',
      content: 'شكراً لتواصلك، سنتواصل معك قريباً',
      direction: 'OUTGOING',
      accountId: 'meras-riyadh-001',  // ← من أي حساب نرسل
      mediaUrl: null
    })
  });
  
  const data = await response.json();
  console.log(data);
}
```

---

#### **الخطوة 2: Next.js API يتحقق من البيانات**

```typescript
// في /app/api/messages/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // 1. جلب بيانات المحادثة والعميل
  const conversation = await prisma.conversation.findUnique({
    where: { id: body.conversationId },
    include: { contact: true }
  });
  
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
  
  // 2. تنسيق رقم الهاتف
  const phoneNumber = conversation.contact.phone.replace(/[^0-9]/g, '');
  // "966501234567"
  
  // ... يتبع في الخطوة التالية
}
```

---

#### **الخطوة 3: Next.js يطلب من WhatsApp Service الإرسال**

```typescript
// استكمال الكود السابق
  
  // 3. إرسال إلى WhatsApp Service
  if (body.direction === 'OUTGOING') {
    const whatsappRes = await fetch('http://localhost:3001/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: body.accountId,           // "meras-riyadh-001"
        phoneNumber: phoneNumber,            // "966501234567"
        message: body.content,               // "شكراً لتواصلك..."
        mediaUrl: body.mediaUrl              // null
      })
    });
    
    const whatsappData = await whatsappRes.json();
    
    if (!whatsappData.success) {
      throw new Error(whatsappData.error);
    }
  }
  
  // ... يتبع
```

---

#### **الخطوة 4: WhatsApp Service يرسل الرسالة**

```javascript
// في server-multi.js
app.post('/send', async (req, res) => {
  const { accountId, phoneNumber, message, mediaUrl, chatId } = req.body;
  
  // التحقق
  if (!accountId) {
    return res.status(400).json({ error: 'accountId is required' });
  }
  
  if (!phoneNumber && !chatId) {
    return res.status(400).json({ error: 'phoneNumber or chatId is required' });
  }
  
  try {
    // استدعاء المدير لإرسال الرسالة
    const result = await manager.sendMessage(
      accountId,
      phoneNumber,
      message,
      mediaUrl,
      chatId
    );
    
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

#### **الخطوة 5: Manager يرسل الرسالة عبر WhatsApp Client**

```javascript
// في multi-client-manager.js
async sendMessage(accountId, phoneNumber, message, mediaUrl, chatId) {
  // 1. جلب بيانات العميل
  const clientData = this.clients.get(accountId);
  
  if (!clientData) {
    throw new Error(`Account ${accountId} not found`);
  }
  
  if (!clientData.isReady) {
    throw new Error(`Account ${accountId} is not ready. Status: ${clientData.status}`);
  }
  
  const { client } = clientData;
  
  // 2. تنسيق Chat ID
  let targetChatId;
  if (chatId) {
    targetChatId = chatId;
  } else {
    const formattedNumber = phoneNumber.replace(/[^0-9]/g, '');
    targetChatId = `${formattedNumber}@c.us`;  // "966501234567@c.us"
  }
  
  console.log(`📤 [${accountId}] Sending to ${targetChatId}`);
  
  // 3. إرسال الرسالة
  if (mediaUrl) {
    // إرسال مع وسائط
    const media = await MessageMedia.fromUrl(mediaUrl);
    if (message) {
      await client.sendMessage(targetChatId, media, { caption: message });
    } else {
      await client.sendMessage(targetChatId, media);
    }
  } else {
    // إرسال نص فقط
    await client.sendMessage(targetChatId, message);
  }
  
  console.log(`✅ [${accountId}] Message sent successfully`);
  
  return { success: true, chatId: targetChatId };
}
```

---

#### **الخطوة 6: Next.js يحفظ في قاعدة البيانات**

```typescript
// العودة إلى /app/api/messages/route.ts

  // 4. حفظ الرسالة في قاعدة البيانات
  const message = await prisma.message.create({
    data: {
      conversationId: body.conversationId,
      content: body.content,
      direction: 'OUTGOING',
      status: 'SENT',
      mediaUrl: body.mediaUrl || null,
      whatsappAccountId: body.accountId  // ← تتبع أي حساب أرسل
    }
  });
  
  // 5. تحديث المحادثة
  await prisma.conversation.update({
    where: { id: body.conversationId },
    data: {
      lastMessageAt: new Date(),
      isRead: true  // الرسائل الصادرة مقروءة
    }
  });
  
  // 6. تسجيل النشاط
  await logActivity({
    action: "CREATE",
    entityType: "Message",
    entityId: message.id,
    description: "Sent OUTGOING message"
  });
  
  return NextResponse.json({
    success: true,
    data: message
  }, { status: 201 });
}
```

**تمت العملية! ✅**

---

## 📥 استقبال رسالة - سير العمل الكامل

### السيناريو: عميل يرسل رسالة على واتساب

#### **الخطوة 1: العميل يرسل رسالة**

```
العميل على هاتفه:
"مرحباً، أريد الاستفسار عن منتج X"

→ يُرسل إلى رقم الأعمال المربوط بالنظام
```

---

#### **الخطوة 2: WhatsApp Client يلتقط الرسالة**

```javascript
// في multi-client-manager.js - setupClientEvents()
client.on('message', async (message) => {
  console.log(`📨 [${accountId}] New message received`);
  
  try {
    // جلب بيانات المحادثة والمرسل
    const chat = await message.getChat();
    const contact = await message.getContact();
    
    // اسم المرسل
    let senderName = contact.pushname || contact.name || contact.number;
    if (chat.isGroup) {
      senderName = chat.name;
    }
    
    console.log(`📨 [${accountId}] Message from ${senderName}: ${message.body.substring(0, 50)}...`);
    
    // إعداد البيانات للإرسال
    const payload = {
      accountId,                              // أي حساب استقبل الرسالة
      from: message.from,                     // "966501234567@c.us"
      body: message.body,                     // "مرحباً، أريد الاستفسار..."
      timestamp: message.timestamp,           // 1705583400
      isGroup: chat.isGroup,                  // false
      senderName: senderName,                 // "أحمد محمد"
      senderId: message.author || message.from,
      hasMedia: message.hasMedia,             // false
      type: message.type                      // "chat"
    };
    
    // إرسال إلى Next.js Webhook
    await fetch(`${this.nextAppUrl}/api/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log(`✅ [${accountId}] Message forwarded to webhook`);
    
    // إرسال حدث محلي
    this.emit('message', { accountId, message: payload });
    
  } catch (error) {
    console.error(`❌ Error handling message for ${accountId}:`, error);
  }
});
```

---

#### **الخطوة 3: Next.js Webhook يستقبل الرسالة**

```typescript
// في /app/api/whatsapp/webhook/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log('📥 Webhook received payload:', body);
  
  const { from, body: messageBody, timestamp, isGroup, senderName, accountId } = body;
  
  // 1. تجاهل Status Broadcasts
  if (from === 'status@broadcast') {
    return NextResponse.json({ success: true, message: 'Status broadcast ignored' });
  }
  
  // 2. استخراج رقم الهاتف
  const phoneNumber = from.split('@')[0];  // "966501234567"
  
  // ... يتبع
}
```

---

#### **الخطوة 4: البحث عن أو إنشاء Contact**

```typescript
  // 3. البحث عن جهة الاتصال
  let contact = await prisma.contact.findUnique({
    where: { phone: phoneNumber }
  });
  
  if (!contact) {
    // إنشاء جهة اتصال جديدة
    console.log(`🆕 Creating new contact: ${senderName} (${phoneNumber})`);
    
    contact = await prisma.contact.create({
      data: {
        name: senderName || phoneNumber,
        phone: phoneNumber,
        tags: isGroup ? ["whatsapp-group"] : ["whatsapp-contact"]
      }
    });
  } else if (senderName && contact.name !== senderName) {
    // تحديث الاسم إذا تغير
    console.log(`🔄 Updating contact name from '${contact.name}' to '${senderName}'`);
    
    contact = await prisma.contact.update({
      where: { id: contact.id },
      data: { name: senderName }
    });
  }
  
  // ... يتبع
```

---

#### **الخطوة 5: البحث عن أو إنشاء Conversation**

```typescript
  // 4. البحث عن محادثة
  let conversation = await prisma.conversation.findFirst({
    where: { contactId: contact.id },
    orderBy: { createdAt: 'desc' }
  });
  
  if (!conversation) {
    // إنشاء محادثة جديدة
    console.log('🆕 Creating NEW conversation');
    
    conversation = await prisma.conversation.create({
      data: {
        contactId: contact.id,
        status: 'ACTIVE',
        isRead: false
      }
    });
  } else if (conversation.status === 'RESOLVED') {
    // إعادة تفعيل المحادثة المغلقة
    console.log(`♻️ Reactivating RESOLVED conversation ${conversation.id}`);
    
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: 'ACTIVE' }
    });
  }
  
  // ... يتبع
```

---

#### **الخطوة 6: إنشاء Message وتحديث Conversation**

```typescript
  // 5. إنشاء الرسالة
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      content: messageBody,
      type: 'TEXT',
      direction: 'INCOMING',
      status: 'DELIVERED',
      whatsappAccountId: accountId || null
    }
  });
  
  // 6. تحديث المحادثة
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      isRead: false  // ← رسالة جديدة غير مقروءة
    }
  });
  
  return NextResponse.json({
    success: true,
    message: 'Message saved successfully',
    data: {
      contactId: contact.id,
      conversationId: conversation.id,
      messageId: message.id
    }
  });
}
```

**تمت العملية! الرسالة الآن في النظام وجاهزة للرد عليها ✅**

---

## 🎛️ Multi-Client Manager - البنية الداخلية

### الهيكل

```javascript
class MultiClientManager extends EventEmitter {
  constructor(nextAppUrl) {
    super();
    this.clients = new Map();  // ← القلب النابض!
    this.nextAppUrl = nextAppUrl;
  }
  
  // Map Structure:
  // ┌────────────────┬──────────────────────────────────┐
  // │ Key (accountId)│ Value (clientData)               │
  // ├────────────────┼──────────────────────────────────┤
  // │ "acc-main-001" │ { client, isReady, status, ... } │
  // │ "acc-main-002" │ { client, isReady, status, ... } │
  // │ "acc-branch-1" │ { client, isReady, status, ... } │
  // └────────────────┴──────────────────────────────────┘
}
```

### ClientData Structure

```javascript
{
  client: Client {                  // ← WhatsApp Web.js Instance
    pupBrowser: Browser {...},
    pupPage: Page {...},
    authStrategy: LocalAuth {...}
  },
  accountId: "acc-main-001",        // معرف الحساب
  phone: "966501234567",            // رقم الهاتف (للمرجعية)
  isReady: true,                    // هل الحساب جاهز؟
  qrCode: null,                     // QR Code (إذا لم يكن متصل)
  status: "CONNECTED",              // الحالة الحالية
  connectedPhone: "966501234567"    // الرقم المتصل فعلياً
}
```

### Status Flow

```
INITIALIZING
    ↓
QR_GENERATED
    ↓
AUTHENTICATED  (بعد مسح QR)
    ↓
CONNECTED      (جاهز للاستخدام)
    
    أو
    
DISCONNECTED   (انقطع الاتصال)
    ↓
AUTH_FAILED    (فشل المصادقة)
```

---

## 🔄 Session Management - إدارة الجلسات

### LocalAuth Strategy

```javascript
authStrategy: new LocalAuth({
  clientId: accountId  // ← كل حساب له clientId فريد
})
```

**ماذا يفعل LocalAuth؟**

```
1. يحفظ بيانات الجلسة في مجلد:
   .wwebjs_auth/session-{clientId}/

2. في المرة القادمة، يقرأ الجلسة المحفوظة
   ← لا حاجة لـ QR Code مرة أخرى!

3. إذا كانت الجلسة صالحة:
   → Login تلقائي ✅

4. إذا انتهت صلاحية الجلسة:
   → طلب QR Code جديد
```

### مثال: هيكل المجلدات

```
whatsapp-service/
├── .wwebjs_auth/
│   ├── session-acc-main-001/
│   │   └── ... (Chrome Profile Data)
│   ├── session-acc-main-002/
│   │   └── ... (Chrome Profile Data)
│   └── session-acc-branch-1/
│       └── ... (Chrome Profile Data)
├── server-multi.js
└── multi-client-manager.js
```

---

## 🛡️ Error Handling - معالجة الأخطاء

### الأخطاء الشائعة

#### 1. **Account Not Found**

```javascript
// سبب الخطأ
await manager.sendMessage('non-existent-account', '966501234567', 'مرحباً');

// الخطأ
Error: Account non-existent-account not found

// الحل
// تأكد من تهيئة الحساب أولاً:
await fetch('http://localhost:3001/initialize/non-existent-account', {...});
```

---

#### 2. **Account Not Ready**

```javascript
// سبب الخطأ
// محاولة الإرسال قبل أن يكون الحساب جاهز

// الخطأ
Error: Account acc-main-001 is not ready. Status: QR_GENERATED

// الحل
// انتظر حتى يصبح isReady = true
const checkReady = setInterval(async () => {
  const status = await fetch('http://localhost:3001/status/acc-main-001').then(r => r.json());
  if (status.isReady) {
    clearInterval(checkReady);
    // الآن يمكنك الإرسال
  }
}, 2000);
```

---

#### 3. **Connection Lost**

```javascript
client.on('disconnected', async (reason) => {
  console.log(`⚠️ Client ${accountId} disconnected:`, reason);
  
  // أسباب شائعة:
  // - "NAVIGATION" → WhatsApp Web أعاد التوجيه
  // - "LOGOUT" → تم تسجيل الخروج من الهاتف
  // - "CONFLICT" → تم تسجيل الدخول من مكان آخر
  
  clientData.isReady = false;
  clientData.status = 'DISCONNECTED';
  
  // تحديث قاعدة البيانات
  await this.updateDatabaseStatus(accountId, 'DISCONNECTED');
  
  // يمكن إعادة الاتصال تلقائياً
  if (reason === 'NAVIGATION') {
    setTimeout(() => {
      this.restartClient(accountId);
    }, 5000);
  }
});
```

---

#### 4. **WhatsApp Service Down**

```typescript
// في Next.js API
try {
  const response = await fetch('http://localhost:3001/send', {...});
} catch (error) {
  // الخطأ: fetch failed
  return NextResponse.json({
    success: false,
    error: 'WhatsApp service unavailable'
  }, { status: 503 });
}
```

**الحل**: تأكد من تشغيل WhatsApp Service:

```bash
cd whatsapp-service
npm start
```

---

## 🎯 Best Practices

### 1. **استخدام accountId وصفي**

```javascript
// ❌ سيء
const accountId = "1";

// ✅ جيد
const accountId = "meras-riyadh-main";
const accountId = "meras-jeddah-support";
const accountId = "meras-dammam-sales";
```

---

### 2. **Graceful Shutdown**

```javascript
process.on('SIGINT', async () => {
  console.log('\n⚠️ SIGINT received, shutting down gracefully...');
  
  // إغلاق جميع العملاء بشكل صحيح
  await manager.shutdownAll();
  
  process.exit(0);
});
```

**لماذا مهم؟**
- يحفظ الجلسات بشكل صحيح
- يغلق متصفحات Puppeteer
- يمنع memory leaks

---

### 3. **Health Monitoring**

```javascript
// في production
setInterval(async () => {
  const health = await fetch('http://localhost:3001/health').then(r => r.json());
  
  if (health.readyAccounts < health.totalAccounts) {
    console.warn(`⚠️ Only ${health.readyAccounts}/${health.totalAccounts} accounts are ready`);
    
    // إرسال تنبيه للمدراء
    await notifyAdmins('Some WhatsApp accounts are not connected');
  }
}, 60000); // كل دقيقة
```

---

### 4. **Retry Logic**

```javascript
async function sendWithRetry(accountId, phone, message, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await manager.sendMessage(accountId, phone, message);
      return result;
    } catch (error) {
      console.log(`❌ Attempt ${i + 1} failed:`, error.message);
      
      if (i === maxRetries - 1) {
        throw error; // آخر محاولة فاشلة
      }
      
      // انتظر قبل المحاولة القادمة
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
}
```

---

### 5. **Message Queue (مستقبلاً)**

```javascript
// للأنظمة الكبيرة، استخدم Redis Queue
const Queue = require('bull');
const messageQueue = new Queue('whatsapp-messages', 'redis://localhost:6379');

// Producer (Next.js)
await messageQueue.add({
  accountId: 'acc-main-001',
  phoneNumber: '966501234567',
  message: 'مرحباً'
});

// Consumer (WhatsApp Service)
messageQueue.process(async (job) => {
  const { accountId, phoneNumber, message } = job.data;
  await manager.sendMessage(accountId, phoneNumber, message);
});
```

**الفوائد**:
- عدم فقدان الرسائل
- إمكانية إعادة المحاولة
- معالجة متوازية

---

## 📊 مثال واقعي: شركة لديها 3 فروع

### السيناريو

```
شركة ميراس لديها 3 فروع:
1. فرع الرياض (رقم: 966501111111)
2. فرع جدة   (رقم: 966502222222)
3. فرع الدمام (رقم: 966503333333)

كل فرع له:
- حساب WhatsApp منفصل
- فريق دعم منفصل
- قاعدة عملاء منفصلة
```

### الإعداد

```javascript
// 1. تهيئة الحسابات الثلاثة
const accounts = [
  { id: 'meras-riyadh', phone: '966501111111' },
  { id: 'meras-jeddah', phone: '966502222222' },
  { id: 'meras-dammam', phone: '966503333333' }
];

for (const account of accounts) {
  await fetch(`http://localhost:3001/initialize/${account.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: account.phone })
  });
}
```

---

### السيناريو 1: عميل يرسل إلى فرع الرياض

```
1. العميل يرسل رسالة إلى 966501111111
        ↓
2. حساب "meras-riyadh" يستقبل الرسالة
        ↓
3. Webhook يحفظ:
   - Contact: أحمد محمد
   - Conversation: مرتبطة بحساب "meras-riyadh"
   - Message: INCOMING
        ↓
4. فريق دعم الرياض يرى الرسالة في Inbox
        ↓
5. الوكيل يرد من نفس الحساب "meras-riyadh"
```

---

### السيناريو 2: عرض موحد لجميع الفروع

```javascript
// في Dashboard الموحد
const fetchAllConversations = async () => {
  // جلب محادثات جميع الفروع
  const conversations = await fetch('http://localhost:3000/api/conversations')
    .then(r => r.json());
  
  // الفلترة حسب الفرع
  const riyadhConvs = conversations.filter(c => 
    c.messages[0]?.whatsappAccountId === 'meras-riyadh'
  );
  
  const jeddahConvs = conversations.filter(c => 
    c.messages[0]?.whatsappAccountId === 'meras-jeddah'
  );
  
  console.log(`الرياض: ${riyadhConvs.length} محادثة`);
  console.log(`جدة: ${jeddahConvs.length} محادثة`);
}
```

---

## 🎓 الخلاصة

### ما تعلمناه

✅ **WhatsApp Service** هي خدمة منفصلة تعمل بجانب Next.js
✅ **Multi-Client Manager** يدير عدة حسابات في نفس الوقت
✅ **كل حساب** له جلسة (session) منفصلة تماماً
✅ **Event-Driven Architecture** للتواصل بين المكونات
✅ **Webhook Pattern** لاستقبال الرسائل الواردة

### التدفق الكامل

```
┌─────────────┐
│   Frontend  │
│   (React)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│  Next.js    │────▶│  WhatsApp    │
│  API Routes │     │   Service    │
└──────┬──────┘     └──────┬───────┘
       │                   │
       │                   ▼
       │            ┌──────────────┐
       │            │  WhatsApp    │
       │            │   Web.js     │
       │            └──────┬───────┘
       │                   │
       ▼                   ▼
┌─────────────────────────────┐
│      MySQL Database         │
│  (Contacts, Messages, etc)  │
└─────────────────────────────┘
```

### Next Steps

1. 🔐 إضافة JWT Authentication
2. 📡 إضافة WebSocket للتحديثات الفورية
3. 🔄 إضافة Queue System (Redis Bull)
4. 📊 إضافة Monitoring (Prometheus + Grafana)
5. 🐳 Dockerization

---

**صُنع بـ ❤️ في السعودية**

*آخر تحديث: 18 يناير 2026*
