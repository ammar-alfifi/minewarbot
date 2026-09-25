// الشريط العلوي: الهوية، الموارد، الحالة، والمساعدة
import React from 'react';
import { t } from '../i18n.js';
import { num, short, duration } from '../format.js';
import { useTick } from '../hooks/useGame.js';

export default function Header({ game, onHelp, onOpenTab, onEditName }) {
  const { player, catalog, mode, displayCoins, displayGems, busy } = game;
  if (!player) return null;
  const boostLeft = player.power.boostUntil - Date.now();
  const shieldLeft = player.raid.shieldUntil - Date.now();
  return (
    <header className="topbar">
      <div className="topbar-row" data-tour="resources">
        <div className="topbar-title">
          <span>⛏️</span>
          <span>{t('appName')}</span>
        </div>
        <span className="chip gold" title={num(displayCoins)}>{busy ? '…' : `🪙 ${short(displayCoins)}`}</span>
        <span className="chip gem" title={num(displayGems)}>💎 {short(displayGems)}</span>
        <button className="icon-btn" onClick={onHelp} aria-label={t('header.help')} title={t('header.help')}>؟</button>
      </div>
      <div className="topbar-row mt8" style={{ gap: 6, flexWrap: 'wrap' }}>
        <button className="chip ghost tiny" onClick={() => onOpenTab('mine')} style={{ cursor: 'pointer' }}>
          {player.region.emoji} {player.region.name} ×{player.region.mult}
        </button>
        <span className="chip ghost tiny">⚡ {short(player.power.manual)} {t('header.power')}</span>
        <span className="chip ghost tiny">🤖 {short(player.power.idlePerSec)} {t('header.idle')}</span>
        {boostLeft > 0 && <span className="chip tiny" style={{ color: 'var(--gem)' }}>⚡ ×2 {duration(boostLeft)}</span>}
        {shieldLeft > 0 && <span className="chip tiny" style={{ color: 'var(--success)' }}>🛡️ {duration(shieldLeft)}</span>}
      </div>
      {mode === 'guest' && (
        <div className="guest-banner">
          <span>🧪 {t('guestMode')}</span>
          <span className="flex muted" style={{ gap: 6 }}>
            {player.name}
            <button className="icon-btn" style={{ width: 26, height: 26, fontSize: 12 }} onClick={onEditName} aria-label="تعديل الاسم">✏️</button>
          </span>
        </div>
      )}
      {mode === 'telegram' && player.title && (
        <div className="topbar-row mt8" style={{ gap: 6 }}>
          <span className="tag">{player.title.emoji} {player.title.name}</span>
          {player.power.event && <span className="tag">🎉 {player.power.event.emoji} {player.power.event.name}</span>}
        </div>
      )}
    </header>
  );
}
