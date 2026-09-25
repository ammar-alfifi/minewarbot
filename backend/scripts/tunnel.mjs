#!/usr/bin/env node
// ============================================================================
// نفق HTTPS ذاتي التحديث (بدون أي حساب):
//  - يشغّل cloudflared quick tunnel إلى الباكند المحلي.
//  - يستخرج الرابط العام ويكتبه في ملف يقرأه البوت.
//  - يحدّث زر القائمة (Menu Button) في تيليجرام تلقائياً بالرابط الجديد.
//  - يعيد التشغيل تلقائياً عند أي انقطاع.
// يُدار عبر systemd (deploy/minewarr-tunnel.service).
// ============================================================================

import 'dotenv/config';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { logError } from '../src/log.js';

const TARGET = process.env.TUNNEL_TARGET || 'http://127.0.0.1:3001';
const CLOUDFLARED = process.env.CLOUDFLARED_BIN || path.join(os.homedir(), '.local', 'bin', 'cloudflared');
const URL_FILE = process.env.PUBLIC_URL_FILE || path.join(os.homedir(), '.local', 'share', 'minewarr', 'public-url.txt');
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const MENU_TEXT = process.env.MENU_BUTTON_TEXT || '⛏️ المنجم';
const URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let child = null;
let stopping = false;
let currentUrl = '';
let failures = 0;

function publishUrl(url) {
  fs.mkdirSync(path.dirname(URL_FILE), { recursive: true });
  fs.writeFileSync(URL_FILE, `${url}\n`);
  console.log(`🌐 الرابط العام الحالي: ${url} (كُتب في ${URL_FILE})`);
}

async function setMenuButton(url) {
  if (!BOT_TOKEN) {
    console.log('ℹ️  لا يوجد BOT_TOKEN — تخطّي تحديث زر القائمة.');
    return;
  }
  for (let attempt = 1; attempt <= 6 && !stopping; attempt++) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_button: { type: 'web_app', text: MENU_TEXT, web_app: { url } } }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      if (data.ok) {
        console.log('✅ تم تحديث زر القائمة في تيليجرام.');
        return;
      }
      logError(`⚠️  رفض تيليجرام زر القائمة (محاولة ${attempt}):`, new Error(data.description || 'unknown'));
    } catch (err) {
      logError(`⚠️  تعذّر تحديث زر القائمة (محاولة ${attempt}):`, err);
    }
    await sleep(Math.min(60_000, 5_000 * attempt));
  }
}

function startCloudflared() {
  return new Promise((resolve) => {
    child = spawn(CLOUDFLARED, ['tunnel', '--url', TARGET, '--no-autoupdate'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    const handle = (buf) => {
      const text = buf.toString();
      process.stdout.write(text);
      if (!currentUrl) {
        const match = text.match(URL_RE);
        if (match) {
          currentUrl = match[0];
          failures = 0;
          publishUrl(currentUrl);
          setMenuButton(currentUrl);
        }
      }
    };

    child.stdout.on('data', handle);
    child.stderr.on('data', handle);
    child.on('error', (err) => {
      logError('❌ تعذّر تشغيل cloudflared:', err);
      resolve();
    });
    child.on('exit', (code, signal) => {
      console.log(`ℹ️  انتهى cloudflared (code=${code}, signal=${signal || '—'})`);
      child = null;
      resolve();
    });
  });
}

function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`🛑 إيقاف النفق (${signal})...`);
  try { child?.kill('SIGTERM'); } catch {}
  setTimeout(() => process.exit(0), 1500);
}
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

// إعادة تأكيد زر القائمة دورياً (لو فشل أول محاولة أو أعيد ضبطه)
setInterval(() => { if (currentUrl && !stopping) setMenuButton(currentUrl); }, 15 * 60_000);

(async () => {
  if (!fs.existsSync(CLOUDFLARED)) {
    console.error(`❌ لم يُعثر على cloudflared في ${CLOUDFLARED}. راجع DEPLOY.md (التشغيل 24/7).`);
    process.exit(1);
  }
  while (!stopping) {
    currentUrl = '';
    await startCloudflared();
    if (stopping) break;
    failures += 1;
    const waitMs = Math.min(60_000, 5_000 * failures);
    console.log(`↻ إعادة تشغيل النفق خلال ${Math.round(waitMs / 1000)} ث...`);
    await sleep(waitMs);
  }
})();
