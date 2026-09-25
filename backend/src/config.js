// ============================================================================
// الإعدادات — كل الأسرار من متغيرات البيئة، ولا توكن حقيقي في الكود إطلاقاً.
// ============================================================================

import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';

const rawToken = (process.env.BOT_TOKEN || '').trim();
// نعتبر التوكن غير مضبوط إذا كان فارغاً أو نصاً توضيحياً من .env.example
const tokenLooksReal = rawToken.length >= 20 && !/ضع|your|replace|example|هنا|xxx/i.test(rawToken);
const botToken = tokenLooksReal ? rawToken : '';

const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
const allowedOrigins = (process.env.ALLOWED_ORIGINS || frontendUrl)
  .split(',')
  .map((s) => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// سرّ جلسات الضيوف: من البيئة، أو مُشتق من التوكن (بدون كشفه)، أو عشوائي للجلسة.
const sessionSecret = process.env.SESSION_SECRET
  || (botToken ? crypto.createHash('sha256').update(`minewarr:v1:${botToken}`).digest('hex') : crypto.randomBytes(32).toString('hex'));

export const config = {
  isProd,
  port: Number(process.env.PORT) || 3001,
  botToken,
  botUsername: (process.env.BOT_USERNAME || 'MineWarrBot').replace(/^@/, ''),
  frontendUrl,
  // ملف يحدّثه نفق HTTPS ليعرف البوت الرابط العام الحالي (اختياري)
  publicUrlFile: process.env.PUBLIC_URL_FILE || '',
  allowedOrigins,
  dataFile: process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'players.json'),
  // json (افتراضي) أو sqlite — نفس واجهة المستودع بلا تغيير في قواعد اللعبة
  storage: (process.env.STORAGE || 'json').toLowerCase() === 'sqlite' ? 'sqlite' : 'json',
  sqliteFile: process.env.SQLITE_FILE || path.join(__dirname, '..', 'data', 'minewarr.db'),
  sessionSecret,
  initDataMaxAgeSec: Number(process.env.INIT_DATA_MAX_AGE_SEC) || 24 * 3600,
  allowGuest: process.env.ALLOW_GUEST ? process.env.ALLOW_GUEST === 'true' : !isProd,
  serveFrontend: process.env.SERVE_FRONTEND ? process.env.SERVE_FRONTEND === 'true' : true,
  trustProxy: process.env.TRUST_PROXY ? process.env.TRUST_PROXY === 'true' : isProd,
};

export function configSummary() {
  return {
    mode: config.isProd ? 'production' : 'development',
    bot: config.botToken ? 'configured' : 'disabled (no BOT_TOKEN)',
    botUsername: config.botUsername,
    frontendUrl: config.frontendUrl,
    allowedOrigins: config.allowedOrigins,
    guestMode: config.allowGuest,
    storage: config.storage,
    storageFile: config.storage === 'sqlite' ? config.sqliteFile : config.dataFile,
    initDataMaxAgeSec: config.initDataMaxAgeSec,
  };
}
