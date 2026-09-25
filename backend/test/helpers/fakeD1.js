// محاكي D1 بسيط للاختبارات: صفّ حالة واحد + عدّاد تعارضات لمحاكاة الكتابة المتزامنة.
const norm = (sql) => sql.replace(/\s+/g, ' ').trim().toLowerCase();

export class FakeD1 {
  constructor() {
    this.row = null;
    this.conflicts = 0;
  }

  async exec() {}

  prepare(sql) {
    const db = this;
    const q = norm(sql);
    const stmt = {
      args: [],
      bind(...args) {
        this.args = args;
        return this;
      },
      async first() {
        if (q.startsWith('select data, rev')) return db.row ? { ...db.row } : null;
        if (q.startsWith('select data')) return db.row ? { data: db.row.data } : null;
        if (q.startsWith('select rev')) return db.row ? { rev: db.row.rev } : null;
        return null;
      },
      async run() {
        if (q.startsWith('insert into state')) {
          if (db.row) throw new Error('UNIQUE constraint failed');
          db.row = { data: this.args[0], rev: 1 };
          return { success: true, meta: { changes: 1 } };
        }
        if (q.startsWith('update state')) {
          const [data, nextRev, baseRev] = this.args;
          if (db.conflicts > 0) {
            db.conflicts -= 1;
            return { success: true, meta: { changes: 0 } };
          }
          if (!db.row || db.row.rev !== baseRev) return { success: true, meta: { changes: 0 } };
          db.row = { data, rev: nextRev };
          return { success: true, meta: { changes: 1 } };
        }
        return { success: true, meta: { changes: 0 } };
      },
    };
    return stmt;
  }
}

/** أصول وهمية للواجهة (تكفي لاختبار الـ API). */
export const fakeAssets = {
  async fetch() {
    return new Response('<!doctype html><html><body>Mine War</body></html>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  },
};
