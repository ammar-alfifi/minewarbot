# خطوات العمل المشترك (GitHub)

## الحالة الحالية ✅
- **الريبو:** https://github.com/ammar-alfifi/minewarbot (عام)
- **الفرع الرئيسي:** `main` — **محمي** (يتطلب Pull Request + موافقة واحدة)
- **البوت:** `@MineWarrBot`

## دعوة صديقك
```bash
gh repo add-collaborator ammar-alfifi/minewarbot <github-username-صديقك> --permission push
```
> ملاحظة: بما أن الريبو **عام**، صديقك يقدر يستنسخه مباشرة، لكن أضفه كمتعاون ليتمكن من الدفع وفتح Pull Requests.

## أول مرة لصديقك
```bash
git clone https://github.com/ammar-alfifi/minewarbot.git
cd minewarbot
npm install --prefix backend && npm install --prefix frontend
cp backend/.env.example backend/.env   # ثم ضع BOT_TOKEN الخاص به
```

## الاستخدام اليومي (لكما أنتما الاثنان)
```bash
git pull origin main
git checkout -b feature/اسم-الميزة
# ... اشتغل ...
git add .
git commit -m "feat: وصف واضح"
git push -u origin feature/اسم-الميزة
```
ثم افتح Pull Request من GitHub واطلب مراجعة الثاني → Merge.

## تقسيم مقترح للشغل
- **أنت:** الباكند + البوت (`backend/`) — الـ API والتحقق من `initData`
- **صديقك:** الواجهة (`frontend/`) — الشاشات و Telegram WebApp SDK
- **مشترك:** ملف الأفكار `IDEAS.md` + التجربة داخل تيليجرام

## النشر المجاني
- **Frontend:** Vercel — `vercel --prod` من مجلد `frontend/`
- **Backend:** Render / Railway — اربط ريبو GitHub وحط `BOT_TOKEN` في Environment Variables
- بعد النشر: حدّث رابط الـ Menu Button في BotFather لرابط Vercel.
