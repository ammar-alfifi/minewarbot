// هوية بصرية لكل منطقة — عرض فقط.
// مفتاحها region.id القادم من السيرفر (rules.js)، ولا تحمل أي رقم لعب.
//
// accent     : لون التمييز (التوهّج، الزر، الجزيئات)
// accent2    : اللون المرافق للتدرّجات
// ink        : لون النص فوق زر المنطقة (داكن لأن ألوان المناطق فاتحة)
// sky        : [أعلى، وسط، أسفل] تدرّج خلفية المشهد
// rock       : [فاتح، وسط، غامق] لتلوين صخرة زر التعدين
// particle   : نوع الجزيئات (dust/soot/sparkle/metal/sand/ember/snow/star)
// fog        : لون الضباب/الوَهج المحيط

export const SCENES = {
  surface: {
    id: 'surface',
    name: 'المدخل الترابي',
    accent: '#e0b077',
    accent2: '#8d6e63',
    ink: '#2b1703',
    sky: ['#c9a97a', '#8d6e63', '#3e2c20'],
    rock: ['#e6bd86', '#a9713d', '#553a22'],
    ground: '#4a3226',
    fog: '#d9b98a',
    particle: 'dust',
    particles: ['#e8cfa6', '#c9a06a', '#f3e3c8'],
  },
  coal: {
    id: 'coal',
    name: 'نفق الفحم',
    accent: '#a9b6c6',
    accent2: '#4b5563',
    ink: '#eef4fa',
    sky: ['#2b323c', '#161a21', '#07090c'],
    rock: ['#8b95a3', '#3f4753', '#15191f'],
    ground: '#0b0d11',
    fog: '#c8862a',
    particle: 'soot',
    particles: ['#6b7280', '#9aa6b5', '#e5e7eb'],
  },
  crystal: {
    id: 'crystal',
    name: 'كهف الكريستال',
    accent: '#63ccff',
    accent2: '#2563eb',
    ink: '#052238',
    sky: ['#0a2a5e', '#123a7a', '#071c3f'],
    rock: ['#a7ecff', '#3f8fe0', '#16307a'],
    ground: '#08203f',
    fog: '#9fe8ff',
    particle: 'sparkle',
    particles: ['#93e0ff', '#58c4ff', '#c7f0ff'],
  },
  iron: {
    id: 'iron',
    name: 'منجم الحديد',
    accent: '#aeb9c7',
    accent2: '#334155',
    ink: '#131a23',
    sky: ['#2a3644', '#161f2b', '#0a0f16'],
    rock: ['#c3ccd8', '#6b7a8d', '#2b3440'],
    ground: '#0d131a',
    fog: '#ffb347',
    particle: 'metal',
    particles: ['#cbd5e1', '#94a3b8', '#e2e8f0'],
  },
  goldcity: {
    id: 'goldcity',
    name: 'مدينة الذهب المفقودة',
    accent: '#f4b942',
    accent2: '#92400e',
    ink: '#3a2405',
    sky: ['#c8963f', '#7a4a15', '#33200a'],
    rock: ['#ffd98a', '#d98b1f', '#8a5310'],
    ground: '#5c3a10',
    fog: '#ffd98a',
    particle: 'sand',
    particles: ['#fde68a', '#f4b942', '#fbbf24'],
  },
  lava: {
    id: 'lava',
    name: 'شقوق اللافا',
    accent: '#ff8a45',
    accent2: '#7f1d1d',
    ink: '#3a1206',
    sky: ['#3a0d08', '#220604', '#0d0202'],
    rock: ['#ffb066', '#c2410c', '#57120a'],
    ground: '#1a0403',
    fog: '#ff6a1a',
    particle: 'ember',
    particles: ['#ff9d5c', '#f97316', '#fca5a5'],
  },
  frost: {
    id: 'frost',
    name: 'الأعماق المتجمدة',
    accent: '#8fd8fc',
    accent2: '#0c4a6e',
    ink: '#052738',
    sky: ['#0d3a5e', '#0a2740', '#051722'],
    rock: ['#dcf5ff', '#65b8e8', '#1e4f74'],
    ground: '#082f49',
    fog: '#bdf1ff',
    particle: 'snow',
    particles: ['#e0f2fe', '#bae6fd', '#ffffff'],
  },
  abyss: {
    id: 'abyss',
    name: 'الهاوية الأبدية',
    accent: '#c084fc',
    accent2: '#4c1d95',
    ink: '#1b1030',
    sky: ['#160a34', '#0c0620', '#03020c'],
    rock: ['#d8b4fe', '#7c3aed', '#2a1250'],
    ground: '#0a0620',
    fog: '#a855f7',
    particle: 'star',
    particles: ['#e9d5ff', '#c084fc', '#a78bfa'],
  },
};

export const DEFAULT_SCENE = SCENES.surface;

/** مشهد منطقة بأمان — يرجع مشهد المدخل إن لم يُعرف المعرّف. */
export function sceneFor(regionId) {
  return SCENES[regionId] || DEFAULT_SCENE;
}
