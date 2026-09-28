// هوية بصرية لكل منطقة — عرض فقط.
// مفتاحها region.id القادم من السيرفر (rules.js)، ولا تحمل أي رقم لعب.
// accent: لون التمييز (زر التعدين/التوهّج) · rock: تدرّج الصخرة · particle: نوع الجزيئات المحيطة.

export const SCENES = {
  surface: {
    accent: '#d9a066',
    accent2: '#8d6e63',
    rock: ['#e0b077', '#a9713d', '#6d4522'],
    ground: '#4a3226',
    sky: '#5d4037',
    particle: 'dust',
    particles: ['#e8cfa6', '#c9a06a', '#f3e3c8'],
  },
  coal: {
    accent: '#9aa6b5',
    accent2: '#4b5563',
    rock: ['#6b7280', '#374151', '#111827'],
    ground: '#1f2937',
    sky: '#111827',
    particle: 'soot',
    particles: ['#6b7280', '#9aa6b5', '#e5e7eb'],
  },
  crystal: {
    accent: '#58c4ff',
    accent2: '#2563eb',
    rock: ['#7dd3fc', '#2563eb', '#1e3a8a'],
    ground: '#1e3a8a',
    sky: '#0f2a5e',
    particle: 'sparkle',
    particles: ['#93e0ff', '#58c4ff', '#c7f0ff'],
  },
  iron: {
    accent: '#a8b3c1',
    accent2: '#334155',
    rock: ['#b8c2cf', '#64748b', '#334155'],
    ground: '#1e293b',
    sky: '#0f172a',
    particle: 'metal',
    particles: ['#cbd5e1', '#94a3b8', '#e2e8f0'],
  },
  goldcity: {
    accent: '#f4b942',
    accent2: '#92400e',
    rock: ['#ffd98a', '#d97706', '#92400e'],
    ground: '#78350f',
    sky: '#3b2408',
    particle: 'sand',
    particles: ['#fde68a', '#f4b942', '#fbbf24'],
  },
  lava: {
    accent: '#ff7a3c',
    accent2: '#7f1d1d',
    rock: ['#fb923c', '#dc2626', '#7f1d1d'],
    ground: '#450a0a',
    sky: '#2a0806',
    particle: 'ember',
    particles: ['#ff9d5c', '#f97316', '#fca5a5'],
  },
  frost: {
    accent: '#7dd3fc',
    accent2: '#0c4a6e',
    rock: ['#cffafe', '#38bdf8', '#0c4a6e'],
    ground: '#082f49',
    sky: '#062033',
    particle: 'snow',
    particles: ['#e0f2fe', '#bae6fd', '#ffffff'],
  },
  abyss: {
    accent: '#c084fc',
    accent2: '#1e1b4b',
    rock: ['#d8b4fe', '#7c3aed', '#1e1b4b'],
    ground: '#12102e',
    sky: '#080720',
    particle: 'star',
    particles: ['#e9d5ff', '#c084fc', '#a78bfa'],
  },
};

export const DEFAULT_SCENE = SCENES.surface;

/** مشهد منطقة بأمان — يرجع مشهد المدخل إن لم يُعرف المعرّف. */
export function sceneFor(regionId) {
  return SCENES[regionId] || DEFAULT_SCENE;
}
