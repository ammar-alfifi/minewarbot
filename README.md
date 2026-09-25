# 🤖 Telegram Mini App — بيئة عمل مشترك

مشروع جاهز لك + صديقك. التقنية: `React + Vite` للواجهة، `Node + Express + Telegraf` للباكند والبوت.

## البنية
```
telegram-miniapp/
├── frontend/          # تطبيق تيليجرام المصغر (يفتح داخل تيليجرام)
├── backend/           # سيرفر API + البوت
├── README.md
└── COLLAB_GUIDE.md    # طريقة العمل المشترك خطوة بخطوة
```

## تشغيل سريع (كل واحد على جهازه)

### 1. المتطلبات
- Node.js 20+
- توكن البوت من [@BotFather](https://t.me/BotFather)

### 2. الإعداد
```bash
# 1- انسخ المشروع (أول مرة)
git clone <رابط-الريبو-المشترك>
cd telegram-miniapp

# 2- الباكند
cd backend
cp .env.example .env
# عدّل .env وحط BOT_TOKEN الحقيقي
npm install
npm run dev
# يشتغل على http://localhost:3001

# 3- الواجهة (ترمينال جديد)
cd frontend
npm install
npm run dev
# تشتغل على http://localhost:5173
```

### 3. ربط البوت بالتطبيق
1. افتح [@BotFather](https://t.me/BotFather) → `/mybots` → اختر بوتك → `Bot Settings` → `Menu Button` → `Configure menu button`
2. حط رابط الواجهة (للتطوير استخدم ngrok، للإنتاج رابط Vercel):
```
https://xxxx.ngrok-free.app
```
3. للتطوير المحلي مع HTTPS:
```bash
ngrok http 5173
# انسخ رابط https وحطه في BotFather + في backend/.env كـ FRONTEND_URL
```

### 4. سير العمل مع صديقك
- `main` محمية — ممنوع الدفع عليها مباشرة
- كل ميزة في برانش: `git checkout -b feature/اسم-الميزة`
- Pull Request + مراجعة من الثاني ثم دمج
- التفاصيل الكاملة في `COLLAB_GUIDE.md`

## أفكار للتطبيق (بما أنكم لسه بتفكروا)
1. **مهام مشتركة / تذكير** — سهل ومناسب للتعلم
2. **نقاط / لعبة مصغرة** — تفاعل عالي داخل تيليجرام
3. **متجر مصغر / طلبات** — عملي وفيه Telegram MainButton + Payments
4. **تصويت / استطلاع للجروبات** — سهل النشر والانتشار

> اختاروا فكرة صغيرة تخلص في 3-5 أيام أول نسخة (MVP).
