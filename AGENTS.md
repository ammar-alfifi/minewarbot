# تعليمات مشروع Mine War (telegram-miniapp)

لعبة تعدين عربية داخل Telegram Mini App. الباكند Node/Express + Telegraf، الواجهة React/Vite،
والنشر الإنتاجي على Cloudflare Workers + D1. **تحقق دائماً قبل إنهاء أي مهمة:** `npm test` و`npm run build`.

## أوامر أساسية
- `npm test` — اختبارات الباكند + اختبار عرض الواجهة SSR.
- `npm run build` — بناء واجهة الإنتاج في `frontend/dist`.
- `npm run dev:backend` — تشغيل API + البوت (polling) على المنفذ 3001.
- `npm run dev:frontend` — واجهة التطوير على 5173 (وضع ضيف).
- `npm run backup` / `npm run restore` — نسخ/استرجاع بيانات اللاعبين.
- `npx wrangler deploy` — نشر الـ Worker (يخدم الواجهة + API + webhook).
- `npm run webhook -- <HTTPS_URL>` — ضبط webhook البوت + زر القائمة + الأوامر.
- `npx wrangler tail` — متابعة سجلات الإنتاج.

## قاعدة النشر على تيليجرام (تلقائية بعد كل تعديل)
بعد **أي تعديل على كود المشروع** (باكند/واجهة/قواعد/بوت/اختبارات) وفي نهاية المهمة،
**انشر على تيليجرام تلقائياً دون انتظار طلب ودون سؤال**، ثم أبلغ بالنتيجة فقط:

1. `npm test` ثم `npm run build` — إن فشل أحدهما توقّف ولا تنشر وأبلغ بالخطأ.
2. `npx wrangler deploy` واستخرج رابط `https://<name>.<subdomain>.workers.dev` من المخرجات.
3. `npm run webhook -- <WORKER_URL>` لضبط webhook وزر القائمة وقائمة الأوامر.
4. تحقق: `curl -s -o /dev/null -w "%{http_code}" <WORKER_URL>/` ← يجب 200،
   و`curl -s <WORKER_URL>/api/health` ← يجب `ok:true`.
5. `git add -A` + `git commit -m "<وصف موجز بالعربية>"` + `git push` — احفظ الكود المُنشَر في
   Git دائماً حتى لا يبقى فرق بين المستودع والإنتاج (وإن لم يوجد فرع متتبَّع، اربطه بـ `-u`).
6. أبلغ بالرابط وإصدار النشر ونتيجة الفحص وهاش الـ commit المرفوع.

يُستثنى فقط: تعديلات لا تمس سلوك اللعبة (وثائق/تعليقات فقط) أو عندما يطلب المستخدم صراحةً عدم النشر.
يجب أن يكون جيت والمستودع نظيفَين (`git status` بلا تغييرات) بعد كل مهمة.
هذه القاعدة سارية في كل المحادثات اللاحقة لأن `AGENTS.md` يُحمَّل تلقائياً في كل جلسة.

رابط الإنتاج الحالي: `https://minewarrbot.alfifi.workers.dev`
(الأسرار مضبوطة على Cloudflare: BOT_TOKEN, SESSION_SECRET, WEBHOOK_SECRET, ADMIN_SECRET, APP_URL.)

## بنية ومسؤوليات
- `backend/src/game/rules.js` — **مصدر الحقيقة** لكل الأرقام والمعادلات والمحتوى. لا تكرّر المعادلات في الواجهة.
- `backend/src/game/engine.js` — منطق اللعب الرسمي؛ السيرفر هو السلطة الوحيدة (أرصدة، عشوائية، غارات، بعث).
- `backend/src/routes.js` — مسارات API الرقيقة + المصادقة + حدود المعدل. أي مسار جديد يُضاف أيضاً في `cloudflare/worker.js`.
- `backend/src/store.js` / `store.sqlite.js` — تخزين؛ نفس الواجهة.
- `cloudflare/` — نسخة العامل (Worker + D1 + Web Crypto) من API والبوت.
- `frontend/src/components/` — شاشات الواجهة؛ `hooks/useGame.js` الجلسة والأوامر؛ `api.js` عميل الـ API.
- `frontend/src/i18n.js` — كل النصوص (RTL عربي).
- ضوابط اللعب في `GAMEPLAY_AUDIT_AND_REPAIR_PLAN.md`.

## قواعد الكود
- أضف أي سلوك لعب في `rules.js`/`engine.js` أولاً، ثم اعرضه جاهزاً عبر `publicState`؛ لا تحسب في الواجهة.
- عدّل مخطط اللاعب عبر رفع `PLAYER_SCHEMA` في `engine.js` مع تطبيع محافظ للحسابات القائمة.
- أي عملية لعب تقبل `requestId` وتُدعم إعادة الإرسال الآمن (`remember`/`replay`).
- أضف اختباراً في `backend/test/` لكل تغيير في القواعد أو المحرك أو المسارات.
- العربية أولاً وRTL في كل النصوص والواجهات. لا مشتريات بمال حقيقي ولا إشعارات إجبارية.
