# خطوات العمل المشترك (GitHub)

## الحالة الحالية ✅
- **الريبو:** https://github.com/ammar-alfifi/minewarbot (عام)
- **الفرع الرئيسي:** `main` — **محمي** (يتطلب Pull Request + موافقة واحدة)
- **البوت:** `@MineWarrBot`
- **النسخة الحالية:** MVP كامل — تعدين، ترقيات، عمّال ومرافق، 8 مناطق، آثار وجواهر، حفرة يومية، أحداث أسبوعية، هدف جماعي، مواسم، لوحات صدارة، وغارات ودّية. الباكند هو مصدر الحقيقة وكل شيء محفوظ على السيرفر.

## البنية السريعة
```
backend/src/game/rules.js   ← كل الأرقام والمعادلات (لا تكررها في الواجهة)
backend/src/game/engine.js  ← منطق اللعب الرسمي
backend/src/routes.js       ← الـ API والمصادقة
frontend/src/components/    ← الشاشات (منجم/ترقيات/أصدقاء/مجموعة)
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
4. **شغّل `npm test`** — يشمل 46 اختباراً للباكند + اختبار عرض لكل الشاشات ببيانات حقيقية.
5. أي ترقية تخزين أو تغيير في الحقول: عدّل `store.js`/`engine.js` مع تحديث الاختبارات.

## تقسيم مقترح للشغل
- **أنت:** الباكند + البوت (`backend/`) — القواعد، الـ API، الغارات، المواسم.
- **صديقك:** الواجهة (`frontend/`) — الشاشات، التلميع البصري، تجربة تيليجرام.
- **مشترك:** المحتوى الجديد (مناطق/آثار/أحداث) في `rules.js` + تجربة داخل تيليجرام + ملف الأفكار `IDEAS.md`.

## النشر المجاني
- **خيار واحد (الأسهل):** انشر الباكند فقط مع `SERVE_FRONTEND=true` بعد `npm run build` — يخدم الواجهة والـ API على نفس النطاق.
- **Render / Railway:** اربط الريبو، ومتغيرات البيئة: `BOT_TOKEN`, `NODE_ENV=production`, `ALLOWED_ORIGINS=https://رابط-الواجهة`, `SESSION_SECRET=قيمة-عشوائية-طويلة`.
- **Frontend منفصل على Vercel:** `vercel --prod` من مجلد `frontend/` مع `VITE_API_URL=https://رابط-الباكند`.
- بعد النشر: حدّث رابط الـ Menu Button في BotFather → `/mybots` → Bot Settings → Menu Button.
