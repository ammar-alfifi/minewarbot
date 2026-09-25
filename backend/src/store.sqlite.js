// ============================================================================
// تخزين SQLite — نفس واجهة مستودع JSON تماماً، لكن بمعاملات ذرّية وملف واحد.
// يستخدم وحدة node:sqlite المدمجة (بدون أي اعتماديات خارجية).
// مناسب للنشر على قرص دائم (VPS / Fly Volume / Render Disk).
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA_VERSION = 2;

function emptyDoc() {
  return { version: SCHEMA_VERSION, players: {}, meta: {} };
}

export function createSqliteStore({ file }) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      player_id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // تحميل كامل إلى الذاكرة (نفس نموذج عمل مستودع JSON)
  const doc = emptyDoc();
  for (const row of db.prepare('SELECT player_id, data FROM players').all()) {
    try {
      doc.players[row.player_id] = JSON.parse(row.data);
    } catch {
      console.error('⚠️  صف لاعب تالف تم تجاهله:', row.player_id);
    }
  }
  const metaRow = db.prepare('SELECT value FROM kv WHERE key = ?').get('meta');
  if (metaRow) {
    try { doc.meta = JSON.parse(metaRow.value); } catch { doc.meta = {}; }
  }

  // ذاكرة آخر نسخة محفوظة لكل لاعب لتحديث المتغيّر فقط
  const lastSerialized = new Map();
  for (const [id, p] of Object.entries(doc.players)) lastSerialized.set(id, JSON.stringify(p));
  let lastMeta = JSON.stringify(doc.meta);

  const upsertPlayer = db.prepare(
    'INSERT INTO players (player_id, data) VALUES (?, ?) ON CONFLICT(player_id) DO UPDATE SET data = excluded.data',
  );
  const deletePlayer = db.prepare('DELETE FROM players WHERE player_id = ?');
  const upsertMeta = db.prepare(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  );

  function persist() {
    db.exec('BEGIN IMMEDIATE');
    try {
      const seen = new Set();
      for (const [id, p] of Object.entries(doc.players)) {
        seen.add(id);
        const json = JSON.stringify(p);
        if (lastSerialized.get(id) !== json) {
          upsertPlayer.run(id, json);
          lastSerialized.set(id, json);
        }
      }
      for (const id of [...lastSerialized.keys()]) {
        if (!seen.has(id)) {
          deletePlayer.run(id);
          lastSerialized.delete(id);
        }
      }
      const metaJson = JSON.stringify(doc.meta || {});
      if (metaJson !== lastMeta) {
        upsertMeta.run('meta', metaJson);
        lastMeta = metaJson;
      }
      db.exec('COMMIT');
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch {}
      throw err;
    }
  }

  let queue = Promise.resolve();
  function runExclusive(task) {
    const next = queue.then(task, task);
    queue = next.then(() => undefined, () => undefined);
    return next;
  }

  return {
    read() {
      return doc;
    },
    get(playerId) {
      return doc.players[playerId] || null;
    },
    snapshot() {
      return doc;
    },
    mutate(fn, { persist: doPersist = true } = {}) {
      return runExclusive(async () => {
        const result = await fn(doc);
        if (doPersist) persist();
        return result;
      });
    },
    idle() {
      return queue;
    },
    close() {
      db.close();
    },
    get file() {
      return file;
    },
  };
}
