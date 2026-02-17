# الاتصال بسيرفر AWS وتشغيل MerasNode

## الاتصال (من PowerShell على جهازك)

```powershell
ssh -i "$env:USERPROFILE\Downloads\meras-key.pem" ec2-user@100.24.75.110
```

## بعد الدخول على السيرفر

```bash
cd MerasNode
```

## أوامر مفيدة بعد `cd MerasNode`

| الأمر | الوصف |
|--------|--------|
| `git pull` | جلب آخر التحديثات من GitHub |
| `./scripts/deploy-on-ec2.sh` | تحديث وتشغيل (build + pm2 restart) |
| `pm2 status` | حالة التطبيق |
| `pm2 restart all` | إعادة تشغيل التطبيق |
| `pm2 logs` | عرض اللوجات |

## تحديث ملف `.env` على السيرفر من جهازك

من **PowerShell** (من مجلد المشروع):

```powershell
scp -i "$env:USERPROFILE\Downloads\meras-key.pem" .env ec2-user@100.24.75.110:~/MerasNode/.env
```

ثم على السيرفر: `pm2 restart all` أو شغّل `./scripts/deploy-on-ec2.sh`.

---

- **المفتاح:** `%USERPROFILE%\Downloads\meras-key.pem`
- **المستخدم:** `ec2-user`
- **العنوان:** `100.24.75.110`
- **المشروع على السيرفر:** `~/MerasNode`
