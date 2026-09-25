import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBot } from './bot.js';
import { validateInitData } from './validate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, '..', 'data', 'players.json');

const app = express();
const PORT = process.env.PORT || 3001;
const BOT_TOKEN = process.env.BOT_TOKEN;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors());
app.use(express.json());

// ---- تخزين بسيط في ملف JSON (يكفي للـ MVP مع الأصدقاء) ----
function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) return {};
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch { return {}; }
}
function saveDB(db) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
const scoreOf = (p) => Math.floor((p.gold || 0) + (p.gems || 0) * 100 + (p.totalMined || 0) * 0.1);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post('/api/me', (req, res) => {
  const { initData } = req.body || {};
  if (!initData) return res.json({ ok: false, note: 'افتح من داخل تيليجرام لإرسال initData' });
  const result = validateInitData(initData, BOT_TOKEN);
  if (!result.ok) return res.status(401).json({ ok: false, reason: result.reason });
  res.json({ ok: true, user: result.user });
});

// حفظ تقدم اللاعب (يُستدعى كل ~10 ثوانٍ من الواجهة)
app.post('/api/sync', (req, res) => {
  const { playerId, name, gold, gems, pickaxe, workers, totalMined } = req.body || {};
  if (!playerId || typeof gold !== 'number' || typeof gems !== 'number') {
    return res.status(400).json({ ok: false, reason: 'bad payload' });
  }
  // حماية بسيطة ضد الغش الفاضح
  if (gold < 0 || gems < 0 || gold > 50_000_000 || gems > 1_000_000) {
    return res.status(400).json({ ok: false, reason: 'suspicious values' });
  }
  const db = loadDB();
  db[playerId] = {
    playerId: String(playerId),
    name: String(name || 'لاعب').slice(0, 30),
    gold: Math.floor(gold), gems: Math.floor(gems),
    pickaxe: Math.min(10, pickaxe || 1), workers: Math.min(100, workers || 0),
    totalMined: Math.floor(totalMined || 0),
    updatedAt: Date.now()
  };
  saveDB(db);
  res.json({ ok: true, score: scoreOf(db[playerId]) });
});

// لوحة ترتيب الأصدقاء — مرتبة حسب الثروة
app.get('/api/leaderboard', (req, res) => {
  const db = loadDB();
  const list = Object.values(db)
    .map((p) => ({ ...p, score: scoreOf(p) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
  res.json({ ok: true, players: list });
});

// ⚔️ غارة: سرقة 10% من ذهب الخصم (بحد 10–500)، نسبة نجاح 50%، cooldown دقيقة
const lastRaid = new Map(); // attackerId -> timestamp
app.post('/api/raid', (req, res) => {
  const { attackerId, targetId } = req.body || {};
  if (!attackerId || !targetId || attackerId === targetId) {
    return res.status(400).json({ ok: false, reason: 'bad ids' });
  }
  const now = Date.now();
  if (now - (lastRaid.get(attackerId) || 0) < 60_000) {
    const wait = Math.ceil((60_000 - (now - lastRaid.get(attackerId))) / 1000);
    return res.status(429).json({ ok: false, reason: `انتظر ${wait} ثانية قبل الغارة التالية` });
  }
  const db = loadDB();
  const att = db[attackerId];
  const tgt = db[targetId];
  if (!att || !tgt) return res.status(404).json({ ok: false, reason: 'سجّل تقدمك أولاً (العب وانتظر الحفظ التلقائي)' });
  if ((tgt.gold || 0) < 20) return res.status(400).json({ ok: false, reason: 'الخصم مفلس — لا يوجد ما يُسرق 😅' });

  lastRaid.set(attackerId, now);
  const success = Math.random() < 0.5;
  if (!success) {
    saveDB(db);
    return res.json({ ok: true, success: false, message: 'فشلت الغارة! الخصم كان مستعداً 🛡️' });
  }
  const stolen = Math.max(10, Math.min(500, Math.floor(tgt.gold * 0.1)));
  tgt.gold -= stolen;
  att.gold += stolen;
  att.updatedAt = now; tgt.updatedAt = now;
  saveDB(db);
  res.json({ ok: true, success: true, stolen, message: `غنيمة! سرقت ${stolen} ذهب 🏆` });
});

app.listen(PORT, () => console.log(`✅ Backend on http://localhost:${PORT}`));

const bot = createBot(BOT_TOKEN?.includes('ضع_التوكن') ? '' : BOT_TOKEN, FRONTEND_URL);
if (bot) {
  bot.launch()
    .then(() => console.log('🤖 Bot running (polling)'))
    .catch((e) => console.log('⚠️ Bot launch failed (تأكد من BOT_TOKEN):', e.message));
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
