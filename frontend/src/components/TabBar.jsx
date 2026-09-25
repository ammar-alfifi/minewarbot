// شريط التبويبات السفلي
import React from 'react';
import { t } from '../i18n.js';

export default function TabBar({ tab, setTab, badges = {} }) {
  const tabs = [
    ['mine', '⛏️', t('tabs.mine')],
    ['upgrades', '🛠️', t('tabs.upgrades')],
    ['friends', '🤝', t('tabs.friends')],
    ['collection', '🏺', t('tabs.collection')],
  ];
  return (
    <nav className="tabbar" role="tablist" aria-label="أقسام اللعبة">
      {tabs.map(([id, icon, label]) => (
        <button
          key={id}
          role="tab"
          aria-selected={tab === id}
          className={tab === id ? 'on' : ''}
          onClick={() => setTab(id)}
        >
          <span className="ico" aria-hidden>{icon}</span>
          <span>{label}</span>
          {badges[id] > 0 && <span className="badge">{badges[id]}</span>}
        </button>
      ))}
    </nav>
  );
}
