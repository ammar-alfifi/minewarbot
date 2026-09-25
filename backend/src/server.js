// ============================================================================
// نقطة التشغيل: تخزين + محرك + API + بوت تيليجرام (polling للتطوير المحلي).
// ============================================================================

import dns from 'node:dns';
import net from 'node:net';
import { config, configSummary } from './config.js';
import { createJsonStore } from './store.js';
import { createSqliteStore } from './store.sqlite.js';
import { createEngine } from './game/engine.js';
import { createApp } from './app.js';
import { createBot } from './bot.js';
import { logError } from './log.js';

// بعض بيئات الاستضافة لا تدعم IPv6: نفضّل IPv4 ونوقف محاولة IPv6 الأولى،
// وإلا تفشل اتصالات البوت بتيليجرام رغم أن الشبكة تعمل (ETIMEDOUT/ENETUNREACH).
dns.setDefaultResultOrder('ipv4first');
if (typeof net.setDefaultAutoSelectFamily === 'function') net.setDefaultAutoSelectFamily(false);

/** اختيار طبقة التخزين حسب الإعداد، مع فشل واضح في الإنتاج عند تعذّر SQLite. */
function createStore() {
  if (config.storage === 'sqlite') {
    try {
      return createSqliteStore({ file: config.sqliteFile });
    } catch (err) {
      logError('❌ تعذّر تشغيل تخزين SQLite:', err);
      if (config.isProd) {
        console.error(`تأكد أن المسار ${config.sqliteFile} قابل للكتابة (قرص دائم) ثم أعد التشغيل.`);
        process.exit(1);
      }
      console.error('ℹ️  وضع التطوير: سنستخدم تخزين JSON مؤقتاً.');
    }
  }
  return createJsonStore({ file: config.dataFile });
}

const store = createStore();
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
  // تشغيل البوت: ننتظر بدء polling فعلياً (bot.polling) بدل انتظار وعد launch
  // الذي لا يُحلّ أبداً ما دام البوت يعمل، مع إعادة محاولة متدرجة عند فشل الشبكة.
  const LAUNCH_TIMEOUT_MS = 60_000;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let botAttempt = 0;

  const launchBot = async () => {
    if (bot.polling) return;
    botAttempt += 1;
    const attempt = botAttempt;
    const launchPromise = bot.launch();
    launchPromise.catch(() => {}); // الرفض يُعالج عبر فحص polling أدناه

    const deadline = Date.now() + LAUNCH_TIMEOUT_MS;
    let rejected = false;
    while (!bot.polling && Date.now() < deadline) {
      const state = await Promise.race([
        launchPromise.then(() => 'done', (err) => { rejected = err; return 'rejected'; }),
        sleep(500).then(() => 'waiting'),
      ]);
      if (state === 'rejected' || state === 'done') break;
    }

    if (bot.polling) {
      botAttempt = 0;
      console.log(`🤖 البوت @${config.botUsername} يعمل (polling)`);
      return;
    }
    const delayMs = Math.min(60_000, 5_000 * attempt);
    logError(`⚠️  تعذّر تشغيل البوت (محاولة ${attempt}) — إعادة المحاولة خلال ${Math.round(delayMs / 1000)} ث:`, rejected || new Error('انتهت مهلة تشغيل البوت'));
    setTimeout(launchBot, delayMs);
  };

  launchBot();
  // مراقبة دورية: لو توقف polling لأي سبب، نعيد التشغيل تلقائياً
  const watcher = setInterval(() => { if (!bot.polling) launchBot(); }, 3 * 60_000);
  watcher.unref?.();
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
  // إغلاق قاعدة SQLite بلطف (checkpoint للـ WAL) إن كانت مستخدمة
  try { store.close?.(); } catch {}
  process.exit(0);
}process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
