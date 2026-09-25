# syntax=docker/dockerfile:1
# ============================================================================
# Mine War — صورة واحدة تخدم الـ API والبوت والواجهة المبنية (SERVE_FRONTEND).
# ============================================================================

# ---------- 1) الاعتماديات (من قفل جذر المشروع) ----------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci

# ---------- 2) اعتماديات الإنتاج فقط ----------
FROM node:24-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci --omit=dev

# ---------- 3) بناء الواجهة ----------
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY frontend ./frontend
RUN npm run build --prefix frontend

# ---------- 4) التشغيل ----------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3001 \
    SERVE_FRONTEND=true \
    STORAGE=sqlite \
    SQLITE_FILE=/data/minewarr.db \
    TRUST_PROXY=true

WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./
COPY backend/package.json ./backend/
COPY backend/src ./backend/src
COPY backend/scripts ./backend/scripts
COPY --from=build /app/frontend/dist ./frontend/dist

RUN mkdir -p /data && chown -R node:node /app /data
USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=6s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

WORKDIR /app/backend
CMD ["node", "src/server.js"]
