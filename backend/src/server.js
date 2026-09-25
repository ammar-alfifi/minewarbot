// ============================================================================
// نقطة التشغيل: تخزين + محرك + API + بوت تيليجرام (polling للتطوير المحلي).
// ============================================================================

import dns from 'node:dns';
import { config, configSummary } from './config.js';
import { createJsonStore } from './store.js';
import { createEngine } from './game/engine.js';
import { createApp } from './app.js';
import { createBot } from './bot.js';
import { logError } from './log.js';

// بعض بيئات الاستضافة لا تدعم IPv6؛ تفضيل IPv4 يجعل اتصال البوت بتيليجرام موثوقاً.
dns.setDefaultResultOrder('ipv4first');

const store = createJsonStore({ file: config.dataFile });
const engine = createEngine({ store, botUsername: config.botUsername });
const app = createApp({ engine, config });

const server = app.listen(config.port, () => {
  console.log(`✅ API جاهز على http://localhost:${config.port}`);
  console.log('⚙️  الإعداد:', JSON.stringify(configSummary()));
});

let bot = null;
try {
  bot = createBot({ token: config.botToken, frontendUrl: config.frontendUrl, botUsername: config.botUsername, engine });
} catch (err) {
  logError('⚠️  تعذّر تجهيز البوت:', err);
}

if (bot) {
  bot.launch()
    .then(() => console.log(`🤖 البوت @${config.botUsername} يعمل (polling)`))
    .catch((err) => logError('⚠️  فشل تشغيل البوت — تأكد من BOT_TOKEN:', err));
} else {
  console.log('ℹ️  البوت معطّل (لا يوجد BOT_TOKEN صالح) — الـ API يعمل للتطوير.');
}

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n🛑 إيقاف (${signal})...`);
  try { bot?.stop(signal); } catch {}
  server.close();
  await store.idle();
  process.exit(0);
}
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
