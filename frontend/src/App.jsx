import React, { useEffect, useRef, useState } from 'react';
import { initTelegram, getUser } from './telegram.js';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SAVE_KEY = 'mine-save-v1';

const pickaxeCost = (lvl) => Math.floor(50 * Math.pow(2.2, lvl - 1)); // 50, 110, 242...
const workerCost = (n) => Math.floor(100 * Math.pow(1.8, n)); // 100, 180, 324...
const perClick = (pickaxe, doubleActive) => pickaxe * (doubleActive ? 2 : 1);

function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || null; } catch { return null; }
}

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('mine'); // mine | shop | rank
  const [gold, setGold] = useState(0);
  const [gems, setGems] = useState(0);
  const [pickaxe, setPickaxe] = useState(1);
  const [workers, setWorkers] = useState(0);
  const [totalMined, setTotalMined] = useState(0);
  const [doubleUntil, setDoubleUntil] = useState(0);
  const [board, setBoard] = useState([]);
  const [msg, setMsg] = useState('');
  const [floats, setFloats] = useState([]);
  const playerId = useRef('');
  const stateRef = useRef({});

  const doubleActive = Date.now() < doubleUntil;
  const perSec = Math.floor(workers * (1 + pickaxe * 0.3));

  // تهيئة اللاعب + تحميل الحفظ
  useEffect(() => {
    const tg = initTelegram();
    const u = getUser();
    setUser(u);
    try { tg.MainButton.hide?.(); tg.setHeaderColor?.('secondary_bg_color'); } catch {}

    const saved = loadSave();
    if (saved) {
      setGold(saved.gold || 0); setGems(saved.gems || 0);
      setPickaxe(saved.pickaxe || 1); setWorkers(saved.workers || 0);
      setTotalMined(saved.totalMined || 0);
      // أرباح الغياب: العمال اشتغلوا عنك (بحد 8 ساعات)
      if (saved.lastSeen && saved.workers > 0) {
        const away = Math.min(8 * 3600, (Date.now() - saved.lastSeen) / 1000);
        const bonus = Math.floor(away * saved.workers * 0.5);
        if (bonus > 0) {
          setGold((g) => g + bonus);
          setTimeout(() => tg.showAlert?.(`عمالك جمعوا ${bonus} ذهب وأنت غايب! ⛏️`), 800);
        }
      }
    }
    playerId.current = String(u?.id || saved?.playerId || ('guest-' + Math.floor(Math.random() * 1e6)));
    fetchBoard();
    const t = setInterval(fetchBoard, 15000);
    return () => clearInterval(t);
  }, []);

  // التعدين التلقائي كل ثانية + حفظ محلي
  useEffect(() => {
    const t = setInterval(() => {
      if (perSec > 0) {
        setGold((g) => g + perSec);
        setTotalMined((m) => m + perSec);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [perSec]);

  // مزامنة مع السيرفر كل 10 ثوانٍ + حفظ محلي
  useEffect(() => {
    stateRef.current = { gold, gems, pickaxe, workers, totalMined };
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...stateRef.current, lastSeen: Date.now(), playerId: playerId.current }));
  }, [gold, gems, pickaxe, workers, totalMined]);

  useEffect(() => {
    const t = setInterval(syncToServer, 10000);
    return () => clearInterval(t);
  }, []);

  const playerName = user ? `${user.first_name}${user.username ? ' @' + user.username : ''}` : 'ضيف';

  async function syncToServer() {
    const s = stateRef.current;
    if (s.gold === undefined) return;
    try {
      await fetch(`${API}/api/sync`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: playerId.current, name: playerName, ...s })
      });
    } catch {}
  }

  async function fetchBoard() {
    try {
      const r = await fetch(`${API}/api/leaderboard`).then((x) => x.json());
      if (r.ok) setBoard(r.players);
    } catch {}
  }

  function haptic(ok = 'light') {
    try { initTelegram().HapticFeedback?.impactOccurred?.(ok); } catch {}
  }

  const mine = (e) => {
    const gain = perClick(pickaxe, doubleActive);
    setGold((g) => g + gain);
    setTotalMined((m) => m + gain);
    haptic('light');
    // جوهرة 4% + أحياناً ذهب مضاعف
    if (Math.random() < 0.04) {
      setGems((g) => g + 1);
      setMsg('💎 جوهرة نادرة!');
    }
    // رقم طائر +N
    const id = Date.now() + Math.random();
    const rect = e.currentTarget.getBoundingClientRect();
    setFloats((f) => [...f.slice(-8), { id, x: rect.left + rect.width / 2, y: rect.top, n: gain }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 700);
  };

  const buyPickaxe = () => {
    const c = pickaxeCost(pickaxe);
    if (gold < c) return setMsg(`تحتاج ${c} ذهب للترقية`);
    setGold((g) => g - c); setPickaxe((p) => p + 1); haptic('medium'); setMsg(`⛏️ معول مستوى ${pickaxe + 1}!`);
  };
  const hireWorker = () => {
    const c = workerCost(workers);
    if (gold < c) return setMsg(`تحتاج ${c} ذهب لتوظيف عامل`);
    setGold((g) => g - c); setWorkers((w) => w + 1); haptic('medium'); setMsg('🧑‍🏭 عامل جديد يعدّن عنك!');
  };
  const buyDouble = () => {
    if (gems < 5) return setMsg('تحتاج 5 جواهر لتفعيل x2 لمدة 5 دقائق');
    setGems((g) => g - 5); setDoubleUntil(Date.now() + 5 * 60 * 1000); setMsg('⚡ x2 مفعّل لـ 5 دقائق!');
  };

  const raid = async (targetId, targetName) => {
    await syncToServer();
    try {
      const r = await fetch(`${API}/api/raid`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attackerId: playerId.current, targetId })
      }).then((x) => x.json());
      setMsg(r.ok ? r.message : `⛔ ${r.reason}`);
      haptic(r.success ? 'heavy' : 'light');
      // حدّث رصيدك فوراً من اللوحة
      fetchBoard();
      if (r.success) setGold((g) => g + (r.stolen || 0));
    } catch { setMsg('فشل الاتصال بالسيرفر'); }
  };

  const share = () => {
    const tg = initTelegram();
    const text = `⛏️ عندي ${Math.floor(gold)} ذهب في المنجم! تقدر تتحداني؟`;
    try {
      tg.openTelegramLink?.(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`);
    } catch { navigator.clipboard?.writeText(text); setMsg('انسخ التحدي وابعته لصديقك!'); }
  };

  return (
    <div style={styles.page}>
      <h2 style={{ margin: '8px 0' }}>⛏️ منجم الأصدقاء</h2>
      <p style={{ margin: 0, color: '#666', fontSize: 13 }}>أهلاً {playerName} — اسبق شلّتك!</p>

      <div style={styles.res}>
        <div style={styles.coin}>🪙 {Math.floor(gold)}</div>
        <div style={styles.coin}>💎 {gems}</div>
      </div>
      <p style={{ fontSize: 12, color: '#888' }}>ضغطة: +{perClick(pickaxe, doubleActive)} | تلقائي: +{perSec}/ث {doubleActive && '⚡x2'}</p>

      <div style={styles.tabs}>
        {[['mine', '⛏️ تعدين'], ['shop', '🛒 ترقيات'], ['rank', '🏆 الشلة']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ ...styles.tab, ...(tab === k ? styles.tabOn : {}) }}>{label}</button>
        ))}
      </div>

      {tab === 'mine' && (
        <div>
          <button onClick={mine} style={styles.mineBtn}>⛏️ عدّن!</button>
          <p style={styles.msg}>{msg}</p>
          <button onClick={share} style={styles.ghost}>📤 تحدَّ صديقك</button>
        </div>
      )}

      {tab === 'shop' && (
        <div style={styles.card}>
          <ShopRow title={`⛏️ معول مستوى ${pickaxe} → ${pickaxe + 1}`} desc={`قوة الضربة تصير +${pickaxe + 1}`} cost={pickaxeCost(pickaxe)} gold={gold} onBuy={buyPickaxe} />
          <ShopRow title={`🧑‍🏭 عامل (${workers})`} desc={`+${Math.floor(1 + pickaxe * 0.3)}/ث لكل عامل، حتى وأنت غايب`} cost={workerCost(workers)} gold={gold} onBuy={hireWorker} />
          <ShopRow title="⚡ ضعف الضرب x2 (5 دقائق)" desc="ادفع 5 جواهر" cost={5} unit="💎" gold={gems} onBuy={buyDouble} />
        </div>
      )}

      {tab === 'rank' && (
        <div style={styles.card}>
          {!board.length && <p style={{ color: '#888' }}>لا يوجد لاعبون بعد — العب قليلاً وانتظر الحفظ التلقائي (10 ثوانٍ).</p>}
          {board.map((p, i) => (
            <div key={p.playerId} style={styles.row}>
              <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {p.name} — {p.score} 🏆</span>
              {p.playerId !== playerId.current
                ? <button style={styles.raid} onClick={() => raid(p.playerId, p.name)}>⚔️ غارة</button>
                : <span style={{ fontSize: 12, color: '#2481cc' }}>(أنت)</span>}
            </div>
          ))}
          <button onClick={fetchBoard} style={styles.ghost}>🔄 تحديث</button>
        </div>
      )}

      {floats.map((f) => (
        <span key={f.id} style={{ ...styles.float, left: f.x - 20, top: f.y - 20 }}>+{f.n}</span>
      ))}
    </div>
  );
}

function ShopRow({ title, desc, cost, gold, onBuy, unit = '🪙' }) {
  const can = gold >= cost;
  return (
    <div style={styles.row}>
      <div><b>{title}</b><br /><small style={{ color: '#666' }}>{desc}</small></div>
      <button onClick={onBuy} disabled={!can} style={{ ...styles.buy, opacity: can ? 1 : 0.4 }}>{cost} {unit}</button>
    </div>
  );
}

const styles = {
  page: { fontFamily: 'system-ui', padding: 16, maxWidth: 480, margin: '0 auto', textAlign: 'center', position: 'relative' },
  res: { display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 },
  coin: { background: '#f4f4f5', borderRadius: 20, padding: '8px 16px', fontWeight: 'bold', fontSize: 18 },
  tabs: { display: 'flex', gap: 8, justifyContent: 'center', margin: '14px 0' },
  tab: { padding: '8px 14px', borderRadius: 20, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' },
  tabOn: { background: '#2481cc', color: '#fff', borderColor: '#2481cc' },
  mineBtn: { fontSize: 26, padding: '26px 50px', borderRadius: 100, border: 0, background: 'linear-gradient(180deg,#ffb300,#ff8f00)', color: '#fff', cursor: 'pointer', boxShadow: '0 6px 0 #c46a00', marginTop: 10 },
  card: { border: '1px solid #eee', borderRadius: 12, padding: 12, textAlign: 'right' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid #f0f0f0' },
  buy: { background: '#22c55e', color: '#fff', border: 0, borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontWeight: 'bold' },
  raid: { background: '#ef4444', color: '#fff', border: 0, borderRadius: 10, padding: '6px 12px', cursor: 'pointer' },
  ghost: { marginTop: 10, background: '#eee', border: 0, borderRadius: 10, padding: '8px 16px', cursor: 'pointer' },
  msg: { minHeight: 20, color: '#b45309', fontSize: 14 },
  float: { position: 'fixed', color: '#16a34a', fontWeight: 'bold', fontSize: 20, pointerEvents: 'none', animation: 'rise .7s ease-out' }
};
