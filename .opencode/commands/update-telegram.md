---
description: نشر اللعبة على Cloudflare Workers وتحديث webhook وزر القائمة (يُنفَّذ تلقائياً بعد كل تعديل)
agent: build
---

انشر أحدث نسخة من اللعبة على تيليجرام. نفّذ الخطوات بالترتيب دون سؤال ودون انتظار تأكيد:

1. `npm test` ثم `npm run build` — توقف وأبلغ إن فشل أحدهما.
2. `npx wrangler deploy` — استخرج رابط `https://<name>.<subdomain>.workers.dev` من مخرجات النشر.
3. `npm run webhook -- <WORKER_URL>` — يضبط webhook البوت وزر القائمة وقائمة الأوامر.
4. تحقق: `curl -s -o /dev/null -w "%{http_code}" <WORKER_URL>/` (يجب 200)، ثم `curl -s <WORKER_URL>/api/health`.
5. أبلغ بإيجاز: رابط الإنتاج، إصدار النشر، ونتيجة الفحص.

رابط الإنتاج الافتراضي إن لم يُحدَّد غيره: https://minewarrbot.alfifi.workers.dev

$ARGUMENTS
