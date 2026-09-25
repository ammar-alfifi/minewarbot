#!/usr/bin/env node
// ============================================================================
// نسخ احتياطي/استيراد بيانات اللعبة — يعمل مع تخزين JSON و SQLite معاً.
//   node scripts/backup.mjs export [ملف-الإخراج]
//   node scripts/backup.mjs import <ملف-النسخة>
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../src/config.js';
import { createJsonStore } from '../src/store.js';
import { createSqliteStore } from '../src/store.sqlite.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function openStore() {
  return config.storage === 'sqlite'
    ? createSqliteStore({ file: config.sqliteFile })
    : createJsonStore({ file: config.dataFile });
}

const command = process.argv[2];
const target = process.argv[3];
const store = openStore();

try {
  if (command === 'export') {
    const doc = store.read();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const out = target || path.join(__dirname, '..', 'backups', `players-${stamp}.json`);
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(doc, null, 2));
    console.log(`✅ تم التصدير: ${out} (${Object.keys(doc.players || {}).length} لاعب، تخزين ${config.storage})`);
  } else if (command === 'import') {
    if (!target) {
      console.error('❌ حدّد ملف النسخة: node scripts/backup.mjs import <ملف>');
      process.exit(1);
    }
    const parsed = JSON.parse(fs.readFileSync(target, 'utf8'));
    const players = parsed.players && typeof parsed.players === 'object' ? parsed.players : parsed;
    const meta = parsed.meta && typeof parsed.meta === 'object' ? parsed.meta : {};
    await store.mutate((doc) => {
      doc.players = {};
      for (const [id, p] of Object.entries(players)) doc.players[id] = p;
      doc.meta = meta;
    });
    await store.idle();
    console.log(`✅ تم الاستيراد: ${Object.keys(players).length} لاعب إلى تخزين ${config.storage}`);
  } else {
    console.log([
      'الاستخدام:',
      '  node scripts/backup.mjs export [ملف-الإخراج]   # نسخة احتياطية JSON',
      '  node scripts/backup.mjs import <ملف>           # استرجاع نسخة',
      '',
      `التخزين الحالي: ${config.storage} (${config.storage === 'sqlite' ? config.sqliteFile : config.dataFile})`,
    ].join('\n'));
    process.exit(1);
  }
} finally {
  store.close?.();
}
