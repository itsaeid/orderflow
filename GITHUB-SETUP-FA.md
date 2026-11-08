# انتقال به GitHub و اجرای پروژه

این بسته شامل تمام ۲۸ فایل سورس نسخه 1d8ad9a، فرانت، بک‌اند، تست‌ها و مستندات است.

۱. ZIP را از حالت فشرده خارج کنید.
۲. یک مخزن خالی و ترجیحاً Private در GitHub بسازید.
۳. در پوشه seyfi-orderflow ترمینال باز کنید و دستورات زیر را اجرا کنید؛ YOUR_USERNAME را جایگزین کنید.

```bash
git init
git add .
git commit -m "Initial Seyfi Flow application"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/seyfi-orderflow.git
git push -u origin main
```

می‌توانید به‌جای ترمینال از GitHub Desktop استفاده کنید و پوشه را به‌عنوان مخزن محلی اضافه و سپس Publish repository کنید.

برای اجرای دموی فرانت:

```bash
npm ci
npm run dev
```

برای تست:

```bash
npm test
npm run typecheck
```

اجرای واقعی بک‌اند به PostgreSQL و تنظیمات محیطی نیاز دارد؛ README.md را بخوانید. .env.example فقط نمونه است. فایل .env حاوی مقادیر واقعی را در GitHub بارگذاری نکنید.

پوشه node_modules، خروجی build و تاریخچه داخلی Git داخل ZIP نیستند. package-lock.json برای نصب وابستگی‌های همان نسخه موجود است. .openai/hosting.json تنظیمات میزبان پیش‌نمایش قبلی است و برای اجرای مستقل یا GitHub لازم نیست؛ برای حفظ تمام سورس اصلی در بسته نگه داشته شده است.

دموی مرورگر از localStorage استفاده می‌کند. وجود فایل‌های بک‌اند در این بسته به معنی استقرار آن‌ها نیست. جزئیات امکانات و محدودیت‌ها در README.md و گزارش تست در docs/TEST-REPORT.md آمده است.
