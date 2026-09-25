# خطوات العمل المشترك (GitHub)

## أول مرة — صاحب المشروع (أنت)
```bash
cd /home/ammar/telegram-miniapp
git init -b main
git add .
git commit -m "feat: initial telegram miniapp scaffold"
gh repo create telegram-miniapp --private --source=. --push
# دعوة الصديق:
gh repo add-collaborator <github-username-صديقك> --permission push
# أو من الموقع: Repo → Settings → Collaborators → Add people
```

## حماية فرع main (مهم)
من GitHub: Settings → Branches → Add rule → Branch name: `main`
- ✅ Require a pull request before merging
- ✅ Require 1 approval

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
