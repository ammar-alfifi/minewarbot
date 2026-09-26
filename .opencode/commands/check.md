---
description: تحقق من جاهزية المشروع (اختبارات + بناء + صحة الإنتاج)
---

نفّذ التحقق التالي وأبلغ بالنتيجة فقط (نجاح/فشل + أول أخطاء إن وُجدت):

الاختبارات:
!`npm test 2>&1 | tail -15`

بناء الواجهة:
!`npm run build 2>&1 | tail -8`

فحص صحة الإنتاج:
!`curl -s --max-time 5 https://minewarrbot.alfifi.workers.dev/api/health || echo "تعذّر الوصول للإنتاج"`
