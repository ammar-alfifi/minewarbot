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
  // إعادة محاولة عند فشل الشبكة (متكرر على بعض بيئات الاستضافة) مع تراجع تدريجي
  let botAttempt = 0;
  const launchBot = async () => {
    try {
      await bot.launch();
      botAttempt = 0;
      console.log(`🤖 البوت @${config.botUsername} يعمل (polling)`);
    } catch (err) {
      botAttempt += 1;
      const delayMs = Math.min(60_000, 5_000 * botAttempt);
      logError(`⚠️  فشل تشغيل البوت (محاولة ${botAttempt}) — إعادة المحاولة خلال ${Math.round(delayMs / 1000)} ث:`, err);
      setTimeout(launchBot, delayMs);
    }
  };
  launchBot();
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
}process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
