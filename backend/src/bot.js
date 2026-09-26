// ============================================================================
// بوت تيليجرام — ترحيب + زر فتح التطبيق + أوامر مساعدة ودعوة.
// لا إشعارات إجبارية: البوت يرد فقط عندما يُكلَّم.
// ============================================================================

import { Telegraf, Markup } from 'telegraf';
import { logError } from './log.js';
import { getPublicUrl } from './publicUrl.js';

const REFERRAL_PREFIX = 'ref_';

/** تهريب رموز Markdown حتى لا يفسّر اسم المستخدم غير الموثوق كنص تنسيقي/رابط. */
const escapeMd = (value) => String(value ?? '').replace(/([_*`[\]\\])/g, '\\$1');

function isHttps(url) {
  return /^https:\/\//i.test(url || '');
}

function appButton(baseUrl, payload, label = '⛏️ افتح المنجم') {
  const url = payload
    ? `${baseUrl}/?startapp=${encodeURIComponent(payload)}`
    : baseUrl;
  // أزرار Web App تتطلب HTTPS؛ خارج ذلك نعرض زر رابط عادي بدل فشل الطلب
  if (isHttps(url)) return Markup.button.webApp(label, url);
  return Markup.button.url(`${label} (وضع المتصفح)`, url);
}

export function createBot({ token, frontendUrl, botUsername = 'MineWarrBot', engine = null }) {
  if (!token) return null;
  const bot = new Telegraf(token);
  // الرابط الفعلي وقت الرد: من ملف النفق إن وُجد، وإلا FRONTEND_URL
  const currentUrl = () => getPublicUrl() || frontendUrl;

  const welcomeText = (name, payload) => {
    const refLine = payload?.startsWith(REFERRAL_PREFIX)
      ? '\n🎁 دعوة من صديق: ستحصل على جواهر ترحيبية عند أول دخول!'
      : '';
    const httpsNote = isHttps(currentUrl())
      ? ''
      : '\n\n⚠️ الرابط الحالي للتطوير المحلي — افتح اللعبة في المتصفح أو شغّل نفق HTTPS (cloudflared/ngrok) لتعمل داخل تيليجرام.';
    return [
      `أهلاً ${name}! ⛏️`,
      '',
      'هذه **Mine War** — منجمك الخاص تحت الأرض:',
      '• عدّن بيدك وارفع قوة معولك',
      '• وظّف عمّالاً يعملون حتى وأنت نائم',
      '• اكتشف الجواهر والآثار النادرة',
      '• نافس أصدقاءك واغزُ خزائنهم (بأدب!)',
      refLine,
      httpsNote,
    ].join('\n');
  };

  bot.start(async (ctx) => {
    const payload = ctx.startPayload || null;
    await ctx.reply(welcomeText(escapeMd(ctx.from.first_name || 'منقّب'), payload), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[appButton(currentUrl(), payload)]]),
    });
  });

  bot.command('app', async (ctx) => {
    await ctx.reply('افتح المنجم من الزر بالأسفل 👇', Markup.inlineKeyboard([[appButton(currentUrl(), null)]]));
  });

  bot.command('help', async (ctx) => {
    await ctx.reply([
      '📖 **مساعدة سريعة**',
      '',
      '/app — افتح اللعبة',
      '/invite — رابط دعوة صديق (مكافآت للطرفين)',
      '/stats — ملخص تقدمك',
      '',
      'كل شيء داخل اللعبة: التعدين، الترقيات، الآثار، لوحة الأصدقاء، والغارات الودّية.',
      'لا إشعارات إجبارية ولا شراء حقيقي — الجواهر تُجمع باللعب.',
    ].join('\n'), { parse_mode: 'Markdown' });
  });

  bot.command('invite', async (ctx) => {
    try {
      const playerId = `tg_${ctx.from.id}`;
      const invite = await engine?.invite(playerId);
      const link = invite?.botLink || `https://t.me/${botUsername}?start=${REFERRAL_PREFIX}${playerId}`;
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('⛏️ انضم لمنجمي في Mine War!')}`;
      await ctx.reply('🎁 شارك رابطك — كل صديق جديد يمنحك جواهر:', {
        ...Markup.inlineKeyboard([[Markup.button.url('📤 شارك الدعوة', shareUrl)], [appButton(currentUrl(), null)]]),
      });
    } catch {
      await ctx.reply('افتح التطبيق أولاً ثم استخدم زر الدعوة داخله 👇', Markup.inlineKeyboard([[appButton(currentUrl(), null)]]));
    }
  });

  bot.command('stats', async (ctx) => {
    try {
      const state = await engine?.getState(`tg_${ctx.from.id}`);
      const p = state?.player;
      if (!p) throw new Error('no player');
      await ctx.reply([
        `📊 **${escapeMd(p.name)}**`,
        `🪙 العملات: ${p.coins}`,
        `💎 الجواهر: ${p.gems}`,
        `${p.region.emoji} المنطقة: ${p.region.name}`,
        `⛏️ قوة الضربة: ${p.power.manual}`,
        `🏺 الآثار: ${p.stats.uniqueRelics}/${p.stats.totalRelics}`,
        `🏆 نقاط الموسم: ${p.season.score}`,
      ].join('\n'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[appButton(currentUrl(), null)]]) });
    } catch {
      await ctx.reply('لم أجد تقدمك بعد — افتح اللعبة وابدأ التعدين أولاً!', Markup.inlineKeyboard([[appButton(currentUrl(), null)]]));
    }
  });

  bot.catch((err) => logError('Bot error:', err));
  return bot;
}
