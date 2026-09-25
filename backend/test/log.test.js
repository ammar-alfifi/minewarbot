// اختبارات تنقية السجلات — لا يتسرب التوكن أبداً
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redact } from '../src/log.js';

test('redact يخفي توكن البوت في الرسائل والأكوام', () => {
  const token = '8978533392:AAHfakeTOKENvalue-1234567890abcdef';
  const message = `request to https://api.telegram.org/bot${token}/getMe failed`;
  const clean = redact(message);
  assert.ok(!clean.includes(token));
  assert.ok(clean.includes('bot<TOKEN>'));
});

test('redact يترك الرسائل العادية كما هي', () => {
  assert.equal(redact('خطأ عادي بلا أسرار'), 'خطأ عادي بلا أسرار');
  assert.equal(redact(new Error('تعذّر الاتصال')).includes('تعذّر الاتصال'), true);
});
