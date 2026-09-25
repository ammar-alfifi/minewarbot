import crypto from 'node:crypto';

// يتحقق أن initData جاي فعلاً من تيليجرام (مهم للأمان قبل قبول أي طلب)
// Docs: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
export function validateInitData(initData, botToken) {
  if (!initData || !botToken) return { ok: false, reason: 'missing data' };
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calc = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  if (calc !== hash) return { ok: false, reason: 'bad hash' };
  try {
    const user = JSON.parse(params.get('user') || '{}');
    return { ok: true, user };
  } catch {
    return { ok: false, reason: 'bad user json' };
  }
}
