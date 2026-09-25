// اختبار الرابط العام الديناميكي (لنفق HTTPS ذاتي التحديث)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { config } from '../src/config.js';
import { getPublicUrl } from '../src/publicUrl.js';

test('getPublicUrl يقرأ رابط النفق ويتحدّث تلقائياً ثم يعود للافتراضي', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'minewarr-url-'));
  const file = path.join(dir, 'public-url.txt');
  const previous = config.publicUrlFile;
  const previousFrontend = config.frontendUrl;
  try {
    config.publicUrlFile = file;
    config.frontendUrl = 'https://fallback.example';

    // لا ملف بعد → القيمة الافتراضية
    assert.equal(getPublicUrl(), 'https://fallback.example');

    fs.writeFileSync(file, 'https://first-tunnel.trycloudflare.com\n');
    assert.equal(getPublicUrl(), 'https://first-tunnel.trycloudflare.com');

    // تغيّر الرابط (نفق جديد) → يُقرأ الجديد
    fs.writeFileSync(file, 'https://second-tunnel.trycloudflare.com\n');
    assert.equal(getPublicUrl(), 'https://second-tunnel.trycloudflare.com');

    // قيمة غير صالحة → لا تُقبل نتجاهلها ونعيد الافتراضي بعد حذف الملف
    fs.writeFileSync(file, 'not-a-url');
    fs.unlinkSync(file);
    assert.equal(getPublicUrl(), 'https://fallback.example');
  } finally {
    config.publicUrlFile = previous;
    config.frontendUrl = previousFrontend;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
