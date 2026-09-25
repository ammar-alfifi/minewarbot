// ============================================================================
// تطبيق Express — CORS مضبوط، رؤوس أمان، وخدمة الواجهة المبنية (اختياري).
// ============================================================================

import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApiRoutes } from './routes.js';
import { logError } from './log.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', '..', 'frontend', 'dist');

function originAllowed(origin, config) {
  if (!origin) return true; // تطبيقات الجوال / أدوات؟ نسمح بلا Origin
  if (config.allowedOrigins.includes(origin)) return true;
  if (config.isProd) return false;
  // بيئات تطوير محلية وأنفاق ngrok شائعة
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    || /^https:\/\/[a-z0-9-]+\.ngrok(-free)?\.(app|io)$/i.test(origin);
}

export function createApp({ engine, config }) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use(cors({
    origin(origin, callback) {
      callback(null, originAllowed(origin, config));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Init-Data'],
    maxAge: 600,
  }));

  app.use(express.json({ limit: '64kb' }));

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    next();
  });

  app.use('/api', createApiRoutes({ engine, config }));

  // خدمة الواجهة المبنية إن وُجدت (نشر آمن بخدمة واحدة)
  if (config.serveFrontend && fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    app.use(express.static(DIST_DIR, { maxAge: '1h', index: false }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  // 404 واضح للـ API
  app.use('/api', (req, res) => {
    res.status(404).json({ ok: false, error: 'مسار غير موجود', code: 'not_found' });
  });

  // معالج الأخطاء النهائي
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ ok: false, error: 'صيغة الطلب غير صالحة', code: 'bad_json' });
    }
    logError('❌ خطأ غير متوقع:', err);
    res.status(500).json({ ok: false, error: 'حدث خطأ في السيرفر — حاول لاحقاً', code: 'server_error' });
  });

  return app;
}
