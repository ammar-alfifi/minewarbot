// ============================================================================
// تخزين D1 (Cloudflare) — نفس واجهة المستودع، لكن غير متزامن وبكتابة ذرّية.
// صف واحد يحمل الحالة كاملة (id = 1) مع عدّاد rev؛ الحفظ عبر:
//   UPDATE state SET data=?, rev=rev+1 WHERE id=1 AND rev=?
// فإن سبقنا تعديل متزامن (rev تغيّر) نُعيد القراءة والمحاولة — بلا فقدان تحديثات
// وبلا حاجة لأقفال تعمل عبر عُقد Edge الموزّعة. مناسب لحجم لعبة بين الأصدقاء.
// ============================================================================

const SCHEMA_VERSION = 2;
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL,
    rev INTEGER NOT NULL
  );
`;

function emptyDoc() {
  return { version: SCHEMA_VERSION, players: {}, meta: {} };
}

function migrate(raw) {
  if (!raw || typeof raw !== 'object') return emptyDoc();
  if (raw.version === SCHEMA_VERSION && raw.players) return raw;
  const doc = emptyDoc();
  const source = raw.players && typeof raw.players === 'object' ? raw.players : raw;
  for (const [id, p] of Object.entries(source)) {
    if (p && typeof p === 'object' && !Array.isArray(p) && (p.playerId || p.gold !== undefined || p.coins !== undefined)) {
      doc.players[id] = p;
    }
  }
  doc.meta = raw.meta && typeof raw.meta === 'object' ? raw.meta : {};
  return doc;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function changesOf(res) {
  if (res && res.meta && typeof res.meta.changes === 'number') return res.meta.changes;
  if (res && typeof res.changes === 'number') return res.changes;
  return undefined;
}

export function createD1Store(db) {
  if (!db) throw new Error('ربط D1 مفقود (env.DB) — أنشئ قاعدة D1 واربطها بالمشروع');

  let ready = null;
  const ensure = () => (ready ||= db.exec(SCHEMA));

  const loadRow = () => db.prepare('SELECT data, rev FROM state WHERE id = 1').first();

  function parseDoc(row) {
    if (!row) return emptyDoc();
    try {
      return migrate(JSON.parse(row.data));
    } catch {
      return emptyDoc();
    }
  }

  return {
    async get(playerId) {
      await ensure();
      return parseDoc(await loadRow()).players[playerId] || null;
    },

    async snapshot() {
      await ensure();
      return parseDoc(await loadRow());
    },

    /**
     * fn(doc) قد تكون متزامنة أو async. تُنفَّذ على نسخة حديثة، ثم تُحفظ حفظاً ذرّياً
     * بمقارنة rev؛ عند التعارض نُعيد المحاولة على نسخة أحدث حتى النجاح.
     */
    async mutate(fn, { persist = true } = {}) {
      await ensure();
      for (let attempt = 0; attempt < 12; attempt++) {
        const row = await loadRow();
        const doc = parseDoc(row);
        const baseRev = row ? row.rev : null;
        const result = await fn(doc);
        if (!persist) return result;

        const data = JSON.stringify(doc);
        let changes;
        if (baseRev === null) {
          try {
            const res = await db.prepare('INSERT INTO state (id, data, rev) VALUES (1, ?, 1)').bind(data).run();
            changes = changesOf(res) ?? 1;
          } catch {
            changes = 0; // سبقتنا نسخة أخرى بالإنشاء
          }
        } else {
          const res = await db
            .prepare('UPDATE state SET data = ?, rev = ? WHERE id = 1 AND rev = ?')
            .bind(data, baseRev + 1, baseRev)
            .run();
          changes = changesOf(res);
        }
        if (changes === 1) return result;

        // تعارض: نسخة أخرى كتبت — ننتظر قليلاً ثم نعيد على أحدث نسخة
        await sleep(10 + attempt * 15);
      }
      throw new Error('تعارض كتابة متكرر على قاعدة البيانات — أعد المحاولة');
    },

    /** استبدال الحالة كاملة (يُستخدم في الاستيراد الإداري فقط). */
    async replace(next) {
      await ensure();
      const data = JSON.stringify(migrate(next));
      for (let attempt = 0; attempt < 12; attempt++) {
        const row = await db.prepare('SELECT rev FROM state WHERE id = 1').first();
        if (!row) {
          try {
            await db.prepare('INSERT INTO state (id, data, rev) VALUES (1, ?, 1)').bind(data).run();
            return;
          } catch {
            await sleep(20);
            continue;
          }
        }
        const res = await db
          .prepare('UPDATE state SET data = ?, rev = ? WHERE id = 1 AND rev = ?')
          .bind(data, row.rev + 1, row.rev)
          .run();
        if (changesOf(res) === 1) return;
        await sleep(20);
      }
      throw new Error('تعارض كتابة متكرر أثناء الاستيراد');
    },

    async idle() {},
  };
}
