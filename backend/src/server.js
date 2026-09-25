import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createBot } from './bot.js';
import { validateInitData } from './validate.js';

const app = express();
const PORT = process.env.PORT || 3001;
const BOT_TOKEN = process.env.BOT_TOKEN;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// مثال endpoint محمي بتحقق تيليجرام
app.post('/api/me', (req, res) => {
  const { initData } = req.body || {};
  // أثناء التطوير من المتصفح (بدون تيليجرام) اسمح بمرور تجريبي
  if (!initData) return res.json({ ok: false, note: 'افتح من داخل تيليجرام لإرسال initData' });
  const result = validateInitData(initData, BOT_TOKEN);
  if (!result.ok) return res.status(401).json({ ok: false, reason: result.reason });
  res.json({ ok: true, user: result.user });
});

app.listen(PORT, () => console.log(`✅ Backend on http://localhost:${PORT}`));

// شغّل البوت (polling — مناسب للتطوير)
const bot = createBot(BOT_TOKEN?.includes('ضع_التوكن') ? '' : BOT_TOKEN, FRONTEND_URL);
if (bot) {
  bot.launch()
    .then(() => console.log('🤖 Bot running (polling)'))
    .catch((e) => console.log('⚠️ Bot launch failed (تأكد من BOT_TOKEN):', e.message));
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
