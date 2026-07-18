# تشغيل المشروع (Tadween)

أوامر التشغيل الأساسية فقط. للتفاصيل الكاملة (البنية، المتغيرات، إلخ) شوف [`README.md`](./README.md).

## 1. أول مرة فقط (Setup)

```bash
# تثبيت الحزم (من جذر المشروع)
pnpm install

# تجهيز ملف البيئة
cp .env.example .env
# ثم افتح .env وعبّي:
#   OPENAI_API_KEY      (مطلوب — Whisper)
#   RESEND_API_KEY       (مطلوب — إرسال إيميلات استعادة كلمة السر والتحقق)
#   EMAIL_FROM
#   UPLOADS_DIR          (مسار مطلق، لازم يكون موجود وقابل للكتابة)

# إنشاء قاعدة بيانات SQLite
pnpm --filter @audio-to-text/db db:push
pnpm --filter @audio-to-text/db db:seed   # اختياري: مستخدم تجريبي
```

## 2. تشغيل المشروع (Dev)

```bash
pnpm dev
```

هاد بيشغّل **كل التطبيقات مع بعض** (web + worker) عبر Turborepo.

> ⚠️ لازم الـ **worker** يكون شغّال جنب الـ **web** حتى يتم تحويل الملفات فعليًا —
> الرفع بيتقبل فورًا (status: `pending`) بس المعالجة صايرة بالخلفية عبر الـ worker.

### تشغيل كل تطبيق لحاله (لو بدك)

```bash
pnpm --filter @audio-to-text/web dev
pnpm --filter @audio-to-text/worker dev
```

الموقع بيفتح على: **http://localhost:3000**

## 3. أوامر مفيدة ثانية

```bash
pnpm test        # تشغيل كل الاختبارات
pnpm typecheck    # فحص الأنواع (TypeScript) لكل الحزم
pnpm lint         # فحص الكود
pnpm build        # بناء كل شي للإنتاج
pnpm format       # تنسيق الكود (Prettier)
```

## 4. أوامر خاصة بقاعدة البيانات

```bash
pnpm --filter @audio-to-text/db db:studio   # فتح Prisma Studio (تصفّح البيانات)
pnpm --filter @audio-to-text/db db:push     # مزامنة الـ schema مع قاعدة البيانات
```
