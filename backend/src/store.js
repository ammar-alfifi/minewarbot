// ============================================================================
// التخزين — مستودع JSON محلي مع كتابة ذرّية وقفل تسلسلي.
// كل الوصول للبيانات يمر من هنا، ليُستبدل لاحقاً بـ SQLite/PostgreSQL
// دون تغيير قواعد اللعبة.
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';

const SCHEMA_VERSION = 2;

function emptyDoc() {
  return { version: SCHEMA_VERSION, players: {}, meta: {} };
}

/** ترحيل تخزين النسخة القديمة ({ [playerId]: player }) إلى المخطط الجديد. */
function migrate(raw) {
  if (!raw || typeof raw !== 'object') return emptyDoc();
  if (raw.version === SCHEMA_VERSION && raw.players) return raw;
  const doc = emptyDoc();
  const source = raw.players && typeof raw.players === 'object' ? raw.players : raw;
  for (const [id, p] of Object.entries(source)) {
    // كيان لاعب (نسخة قديمة gold/pickaxe أو حديث PlayerId) — التطبيع لاحقاً في المحرك
    if (p && typeof p === 'object' && !Array.isArray(p) && (p.playerId || p.gold !== undefined || p.coins !== undefined)) {
      doc.players[id] = p;
    }
  }
  doc.meta = raw.meta && typeof raw.meta === 'object' ? raw.meta : {};
  return doc;
}

export function createJsonStore({ file }) {
  let doc = emptyDoc();
  let queue = Promise.resolve();

  try {
    if (fs.existsSync(file)) {
      doc = migrate(JSON.parse(fs.readFileSync(file, 'utf8')));
    }
  } catch (err) {
    console.error('⚠️  تعذّر قراءة ملف البيانات، سيبدأ تخزين جديد:', err.message);
    doc = emptyDoc();
  }

  function persistSync() {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(doc));
    fs.renameSync(tmp, file);
  }

  function runExclusive(task) {
    const next = queue.then(task, task);
    // لا نُسقط سلسلة العمليات عند الخطأ
    queue = next.then(() => undefined, () => undefined);
    return next;
  }

  return {
    /** قراءة متزامنة للنسخة الحالية في الذاكرة (للاستعلام فقط). */
    read() {
      return doc;
    },

    /** لاعب واحد (متزامن — يُنتظر في المحرك ليعمل على كل المنصّات). */
    get(playerId) {
      return doc.players[playerId] || null;
    },

    /** لقطة كاملة للنسخة (متزامنة هنا، وasync على D1). */
    snapshot() {
      return doc;
    },

    /**
     * تعديل حصري + حفظ ذرّي. fn(doc) قد تكون دالية متزامنة أو async.
     * persist:false مفيد للقراءات التي تحدّث العدّادات الداخلية فقط (توفير كتابة القرص).
     */
    mutate(fn, { persist = true } = {}) {
      return runExclusive(async () => {
        const result = await fn(doc);
        if (persist) persistSync();
        return result;
      });
    },

    /** انتظار انتهاء كل العمليات الجارية (يستخدم في الإغلاق والاختبارات). */
    idle() {
      return queue;
    },

    get file() {
      return file;
    },
  };
}
