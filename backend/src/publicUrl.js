// ============================================================================
// الرابط العام الحالي للعبة.
// عند استخدام نفق HTTPS ذاتي التحديث، يكتب النفق الرابط في ملف ويقرأه البوت هنا،
// فيبقى زر «افتح المنجم» وزر القائمة صحيحين حتى لو تغيّر رابط النفق.
// ============================================================================

import fs from 'node:fs';
import { config } from './config.js';

let cached = { url: '', mtimeMs: -1 };

export function getPublicUrl() {
  const file = config.publicUrlFile;
  if (file) {
    try {
      const stat = fs.statSync(file);
      if (stat.mtimeMs !== cached.mtimeMs) {
        cached = { url: fs.readFileSync(file, 'utf8').trim(), mtimeMs: stat.mtimeMs };
      }
      if (/^https:\/\/[^\s]+$/i.test(cached.url)) return cached.url.replace(/\/+$/, '');
    } catch {
      // الملف غير موجود بعد — نستخدم القيمة الافتراضية
    }
  }
  return config.frontendUrl;
}
