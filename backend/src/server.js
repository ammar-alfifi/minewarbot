// ============================================================================
// نقطة التشغيل: تخزين + محرك + API + بوت تيليجرام (polling للتطوير المحلي).
// ============================================================================

import dns from 'node:dns';
import net from 'node:net';
import { config, configSummary } from './config.js';
import { createJsonStore } from './store.js';
import { createEngine } from './game/engine.js';
import { createApp } from './app.js';
import { createBot } from './bot.js';
import { logError } from './log.js';

// بعض بيئات الاستضافة لا تدعم IPv6: نفضّل IPv4 ونوقف محاولة IPv6 الأولى،
// وإلا تفشل اتصالات البوت بتيليجرام رغم أن الشبكة تعمل (ETIMEDOUT/ENETUNREACH).
dns.setDefaultResultOrder('ipv4first');
if (typeof net.setDefaultAutoSelectFamily === 'function') net.setDefaultAutoSelectFamily(false);

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
  // تشغيل البوت: إعادة محاولة مع حارس زمني.
  // شبكة تيليجرام قد تتقطع، و Telegraf (node-fetch) بلا مهلة افتراضية فقد يعلق.
  const LAUNCH_TIMEOUT_MS = 60_000;
  let botAttempt = 0;
  const launchBot = async () => {
    if (bot.polling) return;
    botAttempt += 1;
    const attempt = botAttempt;
    const launchPromise = bot.launch();
    launchPromise.catch(() => {}); // نمنع unhandled rejection عند خسارة السباق
    try {
      await Promise.race([
        launchPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('انتهت مهلة تشغيل البوت')), LAUNCH_TIMEOUT_MS)),
      ]);
      if (bot.polling) {
        botAttempt = 0;
        console.log(`🤖 البوت @${config.botUsername} يعمل (polling)`);
        return;
      }
      throw new Error('لم يبدأ polling فعلياً');
    } catch (err) {
      const delayMs = Math.min(60_000, 5_000 * attempt);
      logError(`⚠️  تعذّر تشغيل البوت (محاولة ${attempt}) — إعادة المحاولة خلال ${Math.round(delayMs / 1000)} ث:`, err);
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
