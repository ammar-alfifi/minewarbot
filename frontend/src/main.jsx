import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// شبكة أمان ضد النسخ المخبّأة: نقارن ملف الحزمة الحالي بما يقوله index.html على
// الشبكة، فإن اختلفا (نسخة قديمة محفوظة في المتصفح) نحدّث الصفحة تلقائياً مرة واحدة.
// يمنع بقاء اللاعب على حزمة قديمة معطّلة بعد إصلاح منشور.
if (typeof window !== 'undefined') {
  const VERSION_KEY = 'minewarr.build.v1';
  setTimeout(async () => {
    try {
      const current = new URL(import.meta.url).pathname;
      const res = await fetch(window.location.pathname || '/', { cache: 'no-store' });
      const html = await res.text();
      const match = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/);
      if (!match) return;
      if (!current.endsWith(match[0]) && sessionStorage.getItem(VERSION_KEY) !== match[0]) {
        sessionStorage.setItem(VERSION_KEY, match[0]);
        window.location.reload();
      }
    } catch {
      // بلا اتصال أو بيئة غريبة: نتجاهل بهدوء
    }
  }, 1200);
}
