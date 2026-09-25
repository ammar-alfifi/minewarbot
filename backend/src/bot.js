import { Telegraf, Markup } from 'telegraf';

export function createBot(token, frontendUrl) {
  if (!token) {
    console.log('⚠️  BOT_TOKEN غير موجود — البوت لن يشتغل، لكن الـ API سيشتغل.');
    return null;
  }
  const bot = new Telegraf(token);

  bot.start(async (ctx) => {
    await ctx.reply(
      `أهلاً ${ctx.from.first_name}! 👋\nافتح التطبيق المصغر بالزر بالأسفل:`,
      Markup.inlineKeyboard([
        Markup.button.webApp('🚀 افتح التطبيق', frontendUrl || 'https://t.me')
      ])
    );
  });

  bot.command('app', async (ctx) => {
    await ctx.reply(
      'اضغط لفتح التطبيق:',
      Markup.keyboard([[Markup.button.webApp('🚀 افتح التطبيق', frontendUrl || 'https://t.me')]]).resize()
    );
  });

  bot.catch((err) => console.error('Bot error:', err));
  return bot;
}
