# خطوات العمل المشترك (GitHub)

## الحالة الحالية ✅
- **الريبو:** https://github.com/ammar-alfifi/minewarbot (عام)
- **الفرع الرئيسي:** `main` — **محمي** (يتطلب Pull Request + موافقة واحدة)
- **البوت:** `@MineWarrBot`
- **النسخة الحالية:** MVP كامل — تعدين، ترقيات، عمّال ومرافق، 8 مناطق، آثار وجواهر، حفرة يومية، أحداث أسبوعية، هدف جماعي، مواسم، لوحات صدارة، غارات ودّية، وجولة تعليمية قابلة للإعادة. الباكند هو مصدر الحقيقة وكل شيء محفوظ على السيرفر.
- **التخزين:** JSON للتطوير، و**SQLite** للإنتاج (نفس الواجهة) — والنشر عبر Docker موثّق في `DEPLOY.md`.

## البنية السريعة
```
backend/src/game/rules.js   ← كل الأرقام والمعادلات (لا تكررها في الواجهة)
backend/src/game/engine.js  ← منطق اللعب الرسمي
backend/src/routes.js       ← الـ API والمصادقة
backend/src/store.js        ← تخزين JSON (تطوير)
backend/src/store.sqlite.js ← تخزين SQLite (إنتاج، نفس الواجهة)
frontend/src/components/    ← الشاشات (منجم/ترقيات/أصدقاء/مجموعة/جولة)
frontend/src/hooks/useGame.js ← إدارة الحالة في الواجهة
```

## دعوة صديقك
```bash
gh repo add-collaborator ammar-alfifi/minewarbot <github-username-صديقك> --permission push
```
> الريبو **عام**، فيمكنه الاستنساخ مباشرة، لكن أضفه كمتعاون ليتمكن من الدفع وفتح Pull Requests.

## أول مرة لصديقك
```bash
git clone https://github.com/ammar-alfifi/minewarbot.git
cd minewarbot
npm install                            # يعمل بـ npm workspaces
cp backend/.env.example backend/.env   # ثم ضع BOT_TOKEN الخاص به
npm test                                # تأكد أن كل شيء سليم قبل التعديل
```

## الاستخدام اليومي (لكما أنتما الاثنان)
```bash
git pull origin main
git checkout -b feature/اسم-الميزة
# ... اشتغل ...
npm test          # اختبارات الباكند + عرض الواجهة
npm run build     # تأكد أن بناء الإنتاج ينجح
git add .
git commit -m "feat: وصف واضح"
git push -u origin feature/اسم-الميزة
```
ثم افتح Pull Request من GitHub واطلب مراجعة الثاني → Merge.

## قواعد مهمة قبل أي PR
1. **لا تضع معادلات اللعبة في الواجهة** — أضفها في `backend/src/game/rules.js` فقط.
2. **لا تثق بالعميل**: أي رصيد/نتيجة/عشوائية تُحسب في `engine.js`.
3. **لا ترفع `.env`** أو أي توكن. لو انرفع سهواً، أبطِل التوكن من BotFather فوراً.
4. **شغّل `npm test`** — يشمل 56 اختباراً للباكند (قواعد، مصادقة، محرك، تخزين JSON/SQLite، HTTP) + اختبار عرض لكل الشاشات والجولة ببيانات حقيقية.
5. أي ترقية تخزين أو تغيير في الحقول: عدّل `store.js`/`engine.js` مع تحديث الاختبارات.

## تقسيم مقترح للشغل
- **أنت:** الباكند + البوت (`backend/`) — القواعد، الـ API، الغارات، المواسم.
- **صديقك:** الواجهة (`frontend/`) — الشاشات، التلميع البصري، تجربة تيليجرام.
- **مشترك:** المحتوى الجديد (مناطق/آثار/أحداث) في `rules.js` + تجربة داخل تيليجرام + ملف الأفكار `IDEAS.md`.

## النشر المجاني
- **الدليل الكامل:** `DEPLOY.md` (Docker، Oracle Always Free، Fly.io، Render، نطاق ثابت، ونقل البيانات).
- **الأسهل:** Docker على أي سيرفر مع قرص دائم:
  ```bash
  docker compose up -d --build
  ```
- **بديل سريع للتجربة:** جهازك + نفق Cloudflare (`cloudflared tunnel --url http://localhost:3001`).
- بعد النشر: حدّث `FRONTEND_URL`/`ALLOWED_ORIGINS` وزر القائمة عبر `setChatMenuButton`.
