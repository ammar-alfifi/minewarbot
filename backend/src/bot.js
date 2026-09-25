// ============================================================================
// بوت تيليجرام — ترحيب + زر فتح التطبيق + أوامر مساعدة ودعوة.
// لا إشعارات إجبارية: البوت يرد فقط عندما يُكلَّم.
// ============================================================================

import { Telegraf, Markup } from 'telegraf';

const REFERRAL_PREFIX = 'ref_';

function appButton(frontendUrl, payload, label = '⛏️ افتح المنجم') {
  const url = payload
    ? `${frontendUrl}/?startapp=${encodeURIComponent(payload)}`
    : frontendUrl;
  return Markup.button.webApp(label, url);
}

export function createBot({ token, frontendUrl, botUsername = 'MineWarrBot', engine = null }) {
  if (!token) return null;
  const bot = new Telegraf(token);

  const welcomeText = (name, payload) => {
    const refLine = payload?.startsWith(REFERRAL_PREFIX)
      ? '\n🎁 دعوة من صديق: ستحصل على جواهر ترحيبية عند أول دخول!'
      : '';
    return [
      `أهلاً ${name}! ⛏️`,
      '',
      'هذه **Mine War** — منجمك الخاص تحت الأرض:',
      '• عدّن بيدك وارفع قوة معولك',
      '• وظّف عمّالاً يعملون حتى وأنت نائم',
      '• اكتشف الجواهر والآثار النادرة',
      '• نافس أصدقاءك واغزُ خزائنهم (بأدب!)',
      refLine,
    ].join('\n');
  };

  bot.start(async (ctx) => {
    const payload = ctx.startPayload || null;
    await ctx.reply(welcomeText(ctx.from.first_name || 'منقّب', payload), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[appButton(frontendUrl, payload)]]),
    });
  });

  bot.command('app', async (ctx) => {
    await ctx.reply('افتح المنجم من الزر بالأسفل 👇', Markup.inlineKeyboard([[appButton(frontendUrl, null)]]));
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
        ...Markup.inlineKeyboard([[Markup.button.url('📤 شارك الدعوة', shareUrl)], [appButton(frontendUrl, null)]]),
      });
    } catch {
      await ctx.reply('افتح التطبيق أولاً ثم استخدم زر الدعوة داخله 👇', Markup.inlineKeyboard([[appButton(frontendUrl, null)]]));
    }
  });

  bot.command('stats', async (ctx) => {
    try {
      const state = await engine?.getState(`tg_${ctx.from.id}`);
      const p = state?.player;
      if (!p) throw new Error('no player');
      await ctx.reply([
        `📊 **${p.name}**`,
        `🪙 العملات: ${p.coins}`,
        `💎 الجواهر: ${p.gems}`,
        `${p.region.emoji} المنطقة: ${p.region.name}`,
        `⛏️ قوة الضربة: ${p.power.manual}`,
        `🏺 الآثار: ${p.stats.uniqueRelics}/${p.stats.totalRelics}`,
        `🏆 نقاط الموسم: ${p.season.score}`,
      ].join('\n'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[appButton(frontendUrl, null)]]) });
    } catch {
      await ctx.reply('لم أجد تقدمك بعد — افتح اللعبة وابدأ التعدين أولاً!', Markup.inlineKeyboard([[appButton(frontendUrl, null)]]));
    }
  });

  bot.catch((err) => console.error('Bot error:', err?.message || err));
  return bot;
}
