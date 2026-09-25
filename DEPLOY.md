# 🚀 نشر Mine War (تشغيل دائم بدون جهازك)

الهدف: اللعبة والبوت يعملان 24/7 على رابط ثابت، ببيانات دائمة، دون الحاجة لإبقاء جهازك مفتوحاً.

## مقارنة سريعة

| الخيار | التكلفة | البوت دائم؟ | رابط ثابت؟ | ملاحظة |
|---|---|---|---|---|
| **Docker على VPS** (Oracle Always Free / أي VPS) | 0$–5$ | ✅ | ✅ مع نفق Cloudflare أو Caddy | **الأفضل والموصى به** |
| **Fly.io** | ضمن الحصة المجانية تقريباً | ✅ (`auto_stop_machines=false`) | ✅ `*.fly.dev` | ملف `fly.toml` جاهز |
| **Render** | مدفوع للبوت الدائم + قرص | ⚠️ المجاني يُنيم الخدمة | ✅ `*.onrender.com` | ملف `render.yaml` جاهز |
| **جهازك + systemd** | 0$ | ❌ عند النوم/الإطفاء | ⚠️ نفق مؤقت | الأسرع للتجربة فقط |

> البيانات تُخزَّن في **SQLite** على قرص دائم (`STORAGE=sqlite`, `SQLITE_FILE=/data/minewarr.db`) — نفس قواعد اللعبة، ويمكن التبديل إلى JSON بـ `STORAGE=json`.

### ملاحظة مهمة عن الأقراص (Volumes)
- **موصى به:** الحجم المُسمّى في `docker-compose.yml` (`minewarr-data:/data`) — Docker يهيّئ ملكيته من الصورة فتصبح قابلة للكتابة للمستخدم `node` (uid 1000)، وقد اختبرناه: تبقى البيانات بعد إعادة إنشاء الحاوية بالكامل.
- **إن استخدمت bind mount** (مثل `-v ./data:/data`) فغيّر ملكية المجلد على المضيف:
  ```bash
  mkdir -p ./data && sudo chown -R 1000:1000 ./data     # أو المستخدم الذي يعمل عليه الحاوية
  docker run -v ./data:/data:Z ...                       # :Z عند تفعيل SELinux
  ```
- في الإنتاج، إذا تعذّرت الكتابة على مسار SQLite يتوقف السيرفر برسالة واضحة بدل أن يعمل ببيانات مؤقتة.

---

## 0) تجهيز القيم (مشترك في كل الخيارات)

- `BOT_TOKEN` من BotFather (سرّي).
- `FRONTEND_URL` = الرابط العام `https://...` (نفس النطاق الذي يخدم الواجهة).
- `ALLOWED_ORIGINS` = نفس الرابط (يمكن إضافة أكثر بفواصل).
- `SESSION_SECRET` = نصّ عشوائي طويل: `openssl rand -hex 32`.
- `ALLOW_GUEST=false` في الإنتاج (يمنع حسابات الضيوف).
- بعد النشر: اضبط زر القائمة:
```bash
curl "https://api.telegram.org/bot<TOKEN>/setChatMenuButton" -H 'Content-Type: application/json' \
  -d '{"menu_button":{"type":"web_app","text":"⛏️ المنجم","web_app":{"url":"https://your-domain"}}}'
```

---

## 1) Docker (أي VPS أو جهاز)

```bash
git clone https://github.com/ammar-alfifi/minewarbot.git
cd minewarbot

cat > .env <<'ENV'
BOT_TOKEN=ضع_التوكن_هنا
BOT_USERNAME=MineWarrBot
FRONTEND_URL=https://your-domain
ALLOWED_ORIGINS=https://your-domain
SESSION_SECRET=ضع_قيمة_عشوائية_طويلة
ENV

docker compose up -d --build
docker compose logs -f minewarr
```
- البيانات في حجم دائم `minewarr-data` (يبقى بعد التحديثات).
- التحديث لاحقاً: `git pull && docker compose up -d --build`.
- فحص: `curl http://localhost:3001/api/health`.

### إعطاؤه رابط HTTPS ثابت

**الخيار الأسهل: نفق Cloudflare مُسمّى (بدون فتح منافذ وبدون عنوان IP عام):**
```bash
# مرة واحدة
cloudflared tunnel login
cloudflared tunnel create minewarr

cat > ~/.cloudflared/config.yml <<'YML'
tunnel: minewarr
credentials-file: /home/<user>/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: minewarr.example.com
    service: http://127.0.0.1:3001
  - service: http_status:404
YML

cloudflared tunnel route dns minewarr minewarr.example.com
cloudflared tunnel run minewarr      # أو استخدم deploy/minewarr-tunnel.service
```
**البديل: Caddy مع نطاق/DuckDNS** (HTTPS تلقائي):
```bash
sudo apt install caddy
caddy run --config deploy/Caddyfile
```

**نفق سريع للتجربة فقط** (الرابط يتغير كل تشغيل):
```bash
cloudflared tunnel --url http://127.0.0.1:3001
```

---

## 2) Oracle Cloud Always Free (0$ للتشغيل الدائم)

1. أنشئ حساب Always Free ثم VM: `Ubuntu 22.04`، شكل `VM.Standard.A1.Flex` (أرم) أو `E2.1.Micro`.
2. افتح المنفذ 22 فقط، و**لا تحتاج فتح 3001** إن استخدمت نفق Cloudflare.
3. بعد الدخول:
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER && newgrp docker
git clone https://github.com/ammar-alfifi/minewarbot.git && cd minewarbot
# أنشئ ملف .env كما في الخطوة 1
docker compose up -d --build
```
4. ثبّت cloudflared واربط النطاق كما أعلاه (رابط ثابت + HTTPS مجاناً).

---

## 3) Fly.io

```bash
fly auth login
fly launch --no-deploy --copy-config --name minewarr   # يستعمل fly.toml الجاهز

fly volumes create minewarr_data --size 1 --region fra

fly secrets set \
  BOT_TOKEN="..." \
  FRONTEND_URL="https://minewarr.fly.dev" \
  ALLOWED_ORIGINS="https://minewarr.fly.dev" \
  SESSION_SECRET="$(openssl rand -hex 32)"

fly deploy
```
> `auto_stop_machines=false` يبقي البوت يعمل باستمرار. راقب الاستهلاك ضمن الحصة المجانية.

---

## 4) Render

1. اربط الريبو → Render يقرأ `render.yaml` تلقائياً (Docker + Health Check + قرص `/data`).
2. أدخل `BOT_TOKEN`, `FRONTEND_URL`, `ALLOWED_ORIGINS` (و`SESSION_SECRET` يُولَّد تلقائياً).
3. **مهم:** الخطة المجانية تُنيم الخدمة عند الخمول (يتوقف البوت) وبلا قرص دائم — استخدم خطة `starter` وما فوق.

---

## 5) نقل بياناتك الحالية (من جهازك إلى السيرفر)

على جهازك:
```bash
npm run backup --prefix backend          # ينشئ backend/backups/players-<تاريخ>.json
```
ثم على السيرفر (داخل الحاوية):
```bash
docker compose cp backend/backups/players-<تاريخ>.json minewarr:/tmp/backup.json
docker compose exec minewarr node scripts/backup.mjs import /tmp/backup.json
```
> `export`/`import` يعملان مع JSON وSQLite معاً.

### نسخ احتياطي دوري (cron مقترح)
```bash
# يومياً 3 صباحاً داخل الحاوية
0 3 * * * docker compose -f /home/ubuntu/minewarbot/docker-compose.yml exec -T minewarr \
  node scripts/backup.mjs export /data/backups/players.json
```

---

## 6) بديل: تشغيل 24/7 على جهازك بلا أي حساب (نفق ذاتي التحديث)

إن كان جهازك يبقى مشغّلاً (مكتبي/سيرفر منزلي)، هذا أسرع طريق — ونحن جعلناه لا يحتاج حساباً ولا نطاقاً:

- النفق يغيّر رابط `*.trycloudflare.com` عند كل تشغيل، لذلك أضفنا **نفقاً ذاتي التحديث**:
  يكتب الرابط الجديد في ملف يقرأه البوت، **ويحدّث زر القائمة في تيليجرام تلقائياً**.

```bash
# 1) ثبّت cloudflared في مكان دائم
mkdir -p ~/.local/bin ~/.local/share/minewarr ~/.config/systemd/user
curl -L -o ~/.local/bin/cloudflared \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x ~/.local/bin/cloudflared

# 2) ثبّت الخدمات (سيرفر + نفق)
cp deploy/minewarr-backend.service deploy/minewarr-tunnel.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now minewarr-backend minewarr-tunnel

# 3) ليستمرا بعد تسجيل الخروج (قد يطلب كلمة المرور)
sudo loginctl enable-linger $USER

# 4) تحقّق
systemctl --user status minewarr-backend minewarr-tunnel --no-pager
tail -f ~/.local/share/minewarr/tunnel.log      # يظهر الرابط الجديد + تحديث زر القائمة
```

ملاحظات:
- **النوم يوقف كل شيء**: على اللابتوب، أوقف السكون عند إغلاق الغطاء (يحتاج sudo):
  ```bash
  sudo mkdir -p /etc/systemd/logind.conf.d
  printf '[Login]\nHandleLidSwitch=ignore\nHandleLidSwitchExternalPower=ignore\n' | sudo tee /etc/systemd/logind.conf.d/minewarr.conf
  sudo systemctl restart systemd-logind
  ```
  (على بعض الأجهزة: `sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target`)
- لعرض الرابط الحالي:
  `cat ~/.local/share/minewarr/public-url.txt`
- إن أردت رابطاً ثابتاً تماماً مع نطاقك: استخدم النفق المُسمّى في القسم 1 بدل هذا القسم.
- ملاحظة: `STORAGE=json` افتراضياً في هذه الوحدة (مناسب للجهاز نفسه)؛ للإنتاج على سيرفر استخدم SQLite كما هو موصى به أعلاه.

---

## 7) الاحتياطات الإنتاجية

- `ALLOW_GUEST=false` (لا حسابات ضيوف خارج التطوير).
- `ALLOWED_ORIGINS` = نطاقك فقط.
- `SESSION_SECRET` ثابت وعشوائي (تغييره يبطل جلسات الضيوف فقط، لا يمسّ تيليجرام).
- لا تضع التوكن في Git أو الصور — يُمرَّر عبر متغيرات البيئة.
- راقب السجلات: `docker compose logs -f` (التوكن يُنقّى تلقائياً).

## 8) استكشاف الأخطاء

| العَرَض | الحل |
|---|---|
| البوت لا يرد | تأكد أن الخدمة لا تنام، وأن السجل يطبع «البوت يعمل (polling)». |
| «تعذّر الاتصال بالسيرفر» في التطبيق | `FRONTEND_URL` يجب أن يساوي نطاق الواجهة نفسه (الباكند يخدم الواجهة). |
| اختفاء التقدم بعد النشر | تأكد من ربط قرص على `/data` واستخدام `STORAGE=sqlite`. |
| السجل: «تعذّر تشغيل تخزين SQLite» | المسار غير قابل للكتابة — أصلح ملكية المجلد (`chown 1000:1000`) أو استخدم حجم مُسمّى. |
| فشل الاتصال بتيليجرام على VPS | سجلات الشبكة/الجدار — الكود يجرّب IPv4 تلقائياً ويعيد المحاولة. |
| تعارض polling | شغّل نسخة واحدة فقط بنفس التوكن (أوقف القديمة). |
