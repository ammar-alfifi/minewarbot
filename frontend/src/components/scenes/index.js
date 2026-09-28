// فهرس رسومات المناطق: كل منطقة لها مشهد SVG مستقل بمفتاح region.id.
import Surface from './Surface.jsx';
import Coal from './Coal.jsx';
import Crystal from './Crystal.jsx';
import Iron from './Iron.jsx';
import GoldCity from './GoldCity.jsx';
import Lava from './Lava.jsx';
import Frost from './Frost.jsx';
import Abyss from './Abyss.jsx';

export const SCENE_ART = {
  surface: Surface,
  coal: Coal,
  crystal: Crystal,
  iron: Iron,
  goldcity: GoldCity,
  lava: Lava,
  frost: Frost,
  abyss: Abyss,
};

/** رسمة المنطقة بأمان — ترجع مشهد المدخل إن لم يُعرف المعرّف. */
export function artFor(regionId) {
  return SCENE_ART[regionId] || Surface;
}
