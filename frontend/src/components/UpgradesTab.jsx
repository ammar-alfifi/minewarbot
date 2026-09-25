// شاشة الترقيات: معدات، عمّال، مرافق، جواهر
import React, { useState } from 'react';
import { t } from '../i18n.js';
import { num, short } from '../format.js';
import { EffectText } from './ui.jsx';

function UpgradeRow({ def, data, player, qty, onBuy, busy }) {
  const maxed = data?.maxed;
  const isWorker = def.id === 'worker';
  const amount = isWorker ? qty : qty;
  const cost = amount > 1 && data?.cost10 != null ? data.cost10 : data?.cost;
  const resource = isWorker ? 'coins' : (def.resource || 'coins');
  const balance = resource === 'gems' ? player.gems : player.coins;
  const affordable = !maxed && cost != null && balance >= cost;
  const level = isWorker ? data.count : data.level;

  return (
    <div className={`row ${maxed ? 'muted' : ''}`}>
      <span className="emoji">{def.emoji}</span>
      <div className="grow">
        <div className="title">
          {def.name}
          <span className="tag">{level}</span>
        </div>
        <div className="desc">{def.desc}</div>
        {!maxed && (
          <div className="desc">
            {t('upgrades.now')}: {isWorker
              ? `${num(data.rate)} ${t('header.coins')}/ث ${t('upgrades.each')}`
              : <EffectText effect={data.effect} id={def.id} />}
            {data.nextEffect && !isWorker && (
              <> ← <b style={{ color: 'var(--gold)' }}><EffectText effect={data.nextEffect} id={def.id} /></b></>
            )}
          </div>
        )}
      </div>
      {maxed ? (
        <span className="tag">{t('upgrades.maxed')}</span>
      ) : (
        <button
          className="btn success"
          disabled={!affordable || busy}
          onClick={() => onBuy(def.id, amount)}
          title={affordable ? '' : (resource === 'gems' ? t('upgrades.notEnoughGems') : t('upgrades.notEnough'))}
        >
          {resource === 'gems' ? '💎' : '🪙'} {short(cost)}
        </button>
      )}
    </div>
  );
}

export default function UpgradesTab({ game, catalog }) {
  const { player, actions, busy, pushToast } = game;
  const [qty, setQty] = useState(1);
  if (!player || !catalog) return null;

  const buy = async (item, amount) => {
    const res = await actions.upgrade(item, amount);
    if (res) {
      pushToast(item === 'worker' ? t('toasts.hired') : t('toasts.upgraded'), 'success');
    }
  };

  const byId = Object.fromEntries(catalog.upgrades.map((u) => [u.id, u]));
  const equipment = ['pickaxe', 'lamp', 'helmet'];
  const facilities = ['cart', 'smelter', 'storage'];

  return (
    <div>
      <div className="seg">
        {[1, 10].map((n) => (
          <button key={n} className={qty === n ? 'on' : ''} onClick={() => setQty(n)}>×{n}</button>
        ))}
      </div>

      <div className="card">
        <h3 className="card-title">⛏️ {t('upgrades.equipment')}</h3>
        {equipment.map((id) => (
          <UpgradeRow key={id} def={byId[id]} data={player.upgrades[id]} player={player} qty={qty} onBuy={buy} busy={busy} />
        ))}
      </div>

      <div className="card">
        <h3 className="card-title">🧑‍🏭 {t('upgrades.workers')}</h3>
        <UpgradeRow def={byId.worker} data={player.upgrades.worker} player={player} qty={qty} onBuy={buy} busy={busy} />
        <p className="card-sub">
          كل عامل ينتج {num(player.upgrades.worker.rate)} عملة/ث حتى وأنت بعيد، بحد أقصى {player.power.offlineCapHours} ساعات.
        </p>
      </div>

      <div className="card">
        <h3 className="card-title">🏗️ {t('upgrades.facilities')}</h3>
        {facilities.map((id) => (
          <UpgradeRow key={id} def={byId[id]} data={player.upgrades[id]} player={player} qty={qty} onBuy={buy} busy={busy} />
        ))}
      </div>

      <div className="card">
        <h3 className="card-title">💎 {t('upgrades.gems')}</h3>
        <div className="row">
          <span className="emoji">⚡</span>
          <div className="grow">
            <div className="title">{catalog.boost.name}</div>
            <div className="desc">{catalog.boost.desc}</div>
          </div>
          <button
            className="btn success"
            disabled={busy || player.gems < catalog.boost.costGems}
            onClick={() => buy('boost', 1)}
          >
            💎 {catalog.boost.costGems}
          </button>
        </div>
        <div className="row muted">
          <span className="emoji">🏺</span>
          <div className="grow">
            <div className="title">الألقاب التجميلية</div>
            <div className="desc">تُشترى بالجواهر من شاشة المجموعة — لا تأثير على القوة.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
