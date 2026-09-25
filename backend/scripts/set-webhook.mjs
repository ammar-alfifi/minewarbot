// ============================================================================
// ضبط webhook تيليجرام + زر القائمة + قائمة الأوامر — لأي رابط HTTPS عام.
// الاستخدام:
//   npm run webhook --prefix backend -- https://minewarrbot.<sub>.workers.dev
// يقرأ BOT_TOKEN (واختيارياً WEBHOOK_SECRET و BOT_USERNAME) من backend/.env
// ولا يطبع أي سر في المخرجات.
// ============================================================================

import 'dotenv/config';

const token = (process.env.BOT_TOKEN || '').trim();
const secret = (process.env.WEBHOOK_SECRET || '').trim();
const botUsername = (process.env.BOT_USERNAME || 'MineWarrBot').replace(/^@/, '');
const base = (process.argv[2] || process.env.APP_URL || '').trim().replace(/\/+$/, '');

if (!token) {
  console.error('❌ BOT_TOKEN غير مضبوط في backend/.env');
  process.exit(1);
}
if (!/^https:\/\//i.test(base)) {
  console.error('❌ مرّر رابط HTTPS عاماً، مثال:\n   npm run webhook --prefix backend -- https://minewarrbot.<sub>.workers.dev');
  process.exit(1);
}

async function call(method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!data || !data.ok) {
    const desc = data?.description || `HTTP ${res.status}`;
    throw new Error(`${method}: ${desc}`);
  }
  return data.result;
}

const webhookUrl = `${base}/api/telegram/webhook`;

try {
  await call('setWebhook', {
    url: webhookUrl,
    ...(secret ? { secret_token: secret } : {}),
    allowed_updates: ['message'],
    drop_pending_updates: true,
    max_connections: 40,
  });
  console.log('✅ تم ضبط webhook:', webhookUrl);

  await call('setChatMenuButton', {
    menu_button: { type: 'web_app', text: '⛏️ المنجم', web_app: { url: `${base}/` } },
  });
  console.log('✅ تم تحديث زر القائمة إلى:', `${base}/`);

  await call('setMyCommands', {
    commands: [
      { command: 'app', description: 'افتح لعبة Mine War' },
      { command: 'invite', description: 'رابط دعوة صديق (مكافآت للطرفين)' },
      { command: 'stats', description: 'ملخص تقدمك' },
      { command: 'help', description: 'مساعدة' },
    ],
    scope: { type: 'all_private_chats' },
  });
  console.log('✅ تم تحديث قائمة الأوامر');

  if (!secret) {
    console.warn('⚠️  WEBHOOK_SECRET غير مضبوط — يُستحسن ضبطه لحماية نقطة الـ webhook.');
  }
  console.log(`\nالبوت @${botUsername} جاهز. افتحه واضغط «⛏️ المنجم».`);
} catch (err) {
  console.error('❌ فشل الضبط:', err.message);
  process.exit(1);
}
