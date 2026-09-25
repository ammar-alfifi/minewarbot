// ============================================================================
// بوت تيليجرام على Workers — بلا polling: نستقبل تحديثات تيليجرام عبر webhook.
// نستخدم Telegram Bot API مباشرةً عبر fetch (خفيف ومناسب للـ Edge).
// نفس رسائل ونفس أزرار نسخة Node.
// ============================================================================

const REFERRAL_PREFIX = 'ref_';

function isHttps(url) {
  return /^https:\/\//i.test(url || '');
}

/** زر Web App يتطلب HTTPS؛ خارجه نعرض زر رابط عادي. */
export function appButton(baseUrl, payload, label = '⛏️ افتح المنجم') {
  const url = payload ? `${baseUrl}/?startapp=${encodeURIComponent(payload)}` : baseUrl;
  if (isHttps(url)) return { text: label, web_app: { url } };
  return { text: `${label} (وضع المتصفح)`, url };
}

async function callApi(token, method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.ok ? res.json().catch(() => null) : null;
}

/** يعالج تحديثاً واحداً من تيليجرام (رسالة/أمر). */
export async function handleTelegramUpdate(update, { config, engine, baseUrl }) {
  const msg = update?.message || update?.edited_message;
  const text = typeof msg?.text === 'string' ? msg.text.trim() : '';
  const from = msg?.from;
  const token = config?.botToken;
  if (!msg || !from || !text || !token) return;

  const chatId = msg.chat.id;
  const name = from.first_name || 'منقّب';
  const [rawCmd, ...rest] = text.split(/\s+/);
  const command = rawCmd.split('@')[0].toLowerCase();
  const payload = rest[0] || null;
  const playerId = `tg_${from.id}`;
  const startButton = { reply_markup: { inline_keyboard: [[appButton(baseUrl, payload)]] } };

  const welcome = () => {
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

  try {
    switch (command) {
      case '/start':
        await callApi(token, 'sendMessage', { chat_id: chatId, text: welcome(), parse_mode: 'Markdown', ...startButton });
        break;

      case '/app':
        await callApi(token, 'sendMessage', {
          chat_id: chatId,
          text: 'افتح المنجم من الزر بالأسفل 👇',
          reply_markup: { inline_keyboard: [[appButton(baseUrl, null)]] },
        });
        break;

      case '/help':
        await callApi(token, 'sendMessage', {
          chat_id: chatId,
          parse_mode: 'Markdown',
          text: [
            '📖 **مساعدة سريعة**',
            '',
            '/app — افتح اللعبة',
            '/invite — رابط دعوة صديق (مكافآت للطرفين)',
            '/stats — ملخص تقدمك',
            '',
            'كل شيء داخل اللعبة: التعدين، الترقيات، الآثار، لوحة الأصدقاء، والغارات الودّية.',
            'لا إشعارات إجبارية ولا شراء حقيقي — الجواهر تُجمع باللعب.',
          ].join('\n'),
          reply_markup: { inline_keyboard: [[appButton(baseUrl, null)]] },
        });
        break;

      case '/invite': {
        let invite = null;
        try {
          invite = await engine?.invite(playerId);
        } catch {
          invite = null;
        }
        const link = invite?.botLink || `https://t.me/${config.botUsername}?start=${REFERRAL_PREFIX}${playerId}`;
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('⛏️ انضم لمنجمي في Mine War!')}`;
        await callApi(token, 'sendMessage', {
          chat_id: chatId,
          text: '🎁 شارك رابطك — كل صديق جديد يمنحك جواهر:',
          reply_markup: { inline_keyboard: [[{ text: '📤 شارك الدعوة', url: shareUrl }], [appButton(baseUrl, null)]] },
        });
        break;
      }

      case '/stats': {
        let lines = 'لم أجد تقدمك بعد — افتح اللعبة وابدأ التعدين أولاً!';
        try {
          const state = await engine?.getState(playerId);
          const p = state?.player;
          if (p) {
            lines = [
              `📊 **${p.name}**`,
              `🪙 العملات: ${p.coins}`,
              `💎 الجواهر: ${p.gems}`,
              `${p.region.emoji} المنطقة: ${p.region.name}`,
              `⛏️ قوة الضربة: ${p.power.manual}`,
              `🏺 الآثار: ${p.stats.uniqueRelics}/${p.stats.totalRelics}`,
              `🏆 نقاط الموسم: ${p.season.score}`,
            ].join('\n');
          }
        } catch {
          /* نعرض النص الافتراضي */
        }
        await callApi(token, 'sendMessage', {
          chat_id: chatId,
          text: lines,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[appButton(baseUrl, null)]] },
        });
        break;
      }

      default:
        break;
    }
  } catch {
    /* لا نُفشل استجابة الـ webhook بسبب خطأ في الرد */
  }
}
