// متجر التجميل: مصارف جواهر اختيارية لا تمنح أي تفوق تنافسي.
import React from 'react';
import { t } from '../i18n.js';
import { num } from '../format.js';

export default function CosmeticSheet({ game, onClose }) {
  const { player, actions, busy } = game;
  if (!player?.cosmetics) return null;
  const { shop, equipped } = player.cosmetics;
  const close = () => onClose?.();

  const onBuy = async (item) => {
    const res = await actions.cosmetic(item.id);
    if (res) close();
  };

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="sheet wide" role="dialog" aria-modal="true">
        <div className="head center">🎨 {t('cosmetics.title')}</div>
        <p className="card-sub center">{t('cosmetics.hint')}</p>
        <div className="small center mb8">💎 {num(player.gems)}</div>
        {shop.map((item) => {
          const isEquipped = equipped[item.type] === item.id;
          return (
            <div key={item.id} className="row">
              <span className="emoji">{item.emoji}</span>
              <div className="grow">
                <div className="title">{item.name} {isEquipped && <span className="tag me">{t('cosmetics.equipped')}</span>}</div>
                <div className="desc">{item.desc}</div>
              </div>
              {item.owned ? (
                <button className="btn small ghost" disabled={busy || isEquipped} onClick={() => onBuy(item)}>{t('cosmetics.equip')}</button>
              ) : (
                <button className="btn small success" disabled={busy || player.gems < item.cost} onClick={() => onBuy(item)}>💎 {item.cost}</button>
              )}
            </div>
          );
        })}
        <button className="btn ghost big mt12" onClick={close}>{t('modals.close')}</button>
      </div>
    </div>
  );
}
