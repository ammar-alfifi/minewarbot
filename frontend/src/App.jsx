import React, { useEffect, useState } from 'react';
import { initTelegram, getUser, getInitData } from './telegram.js';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function App() {
  const [user, setUser] = useState(null);
  const [serverMsg, setServerMsg] = useState('...');
  const [count, setCount] = useState(0);

  useEffect(() => {
    const tg = initTelegram();
    setUser(getUser());

    // تلوين الهيدر بلون ثيم تيليجرام
    try {
      tg.setHeaderColor?.('secondary_bg_color');
      tg.MainButton.setText('جرّب الزر الرئيسي');
      tg.MainButton.onClick(() => tg.showAlert(`أهلاً ${getUser()?.first_name || 'صديق'}! 🎉`));
      tg.MainButton.show();
    } catch {}

    // اختبار الاتصال بالباكند
    fetch(`${API}/api/health`)
      .then((r) => r.json())
      .then((d) => setServerMsg(d.ok ? `متصل بالسيرفر ✅ (${d.time})` : 'رد غير متوقع'))
      .catch(() => setServerMsg('السيرفر غير شغال — شغّل backend أولاً'));

    return () => tg.MainButton.hide?.();
  }, []);

  const sendAuthTest = async () => {
    try {
      const res = await fetch(`${API}/api/me`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: getInitData() })
      });
      const data = await res.json();
      alert(JSON.stringify(data, null, 2));
    } catch (e) {
      alert('فشل الاتصال: ' + e.message);
    }
  };

  return (
    <div style={styles.page}>
      <h1>🚀 تطبيقكم المصغر</h1>
      <p>أهلاً {user ? `${user.first_name} (@${user.username || '—'})` : 'افتح الصفحة من داخل تيليجرام لرؤية اسمك'}</p>
      <p style={styles.badge}>{serverMsg}</p>

      <div style={styles.card}>
        <h3>عدّاد تجريبي (كل واحد يعدّل هنا أول PR)</h3>
        <p style={{ fontSize: 32 }}>{count}</p>
        <button style={styles.btn} onClick={() => setCount((c) => c + 1)}>+1</button>
      </div>

      <button style={{ ...styles.btn, marginTop: 12 }} onClick={sendAuthTest}>
        اختبار التحقق من تيليجرام (initData)
      </button>

      <p style={styles.hint}>
        ✨ أنت تشتغل على <code>frontend/src/App.jsx</code> — صديقك يشتغل على{' '}
        <code>backend/src/server.js</code> بدون تعارض.
      </p>
    </div>
  );
}

const styles = {
  page: { fontFamily: 'system-ui', padding: 20, maxWidth: 480, margin: '0 auto', textAlign: 'center' },
  card: { border: '1px solid #ddd', borderRadius: 12, padding: 16, marginTop: 16 },
  btn: { padding: '10px 20px', borderRadius: 10, border: 0, background: '#2481cc', color: '#fff', fontSize: 16, cursor: 'pointer' },
  badge: { background: '#f0f0f0', borderRadius: 8, padding: 8 },
  hint: { marginTop: 20, color: '#666', fontSize: 14 }
};
