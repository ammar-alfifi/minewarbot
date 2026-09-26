// التطبيق: الهيكل العام، التبويبات، الطبقات العائمة
import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from './hooks/useGame.js';
import { t } from './i18n.js';
import Header from './components/Header.jsx';
import TabBar from './components/TabBar.jsx';
import MineTab from './components/MineTab.jsx';
import UpgradesTab from './components/UpgradesTab.jsx';
import FriendsTab from './components/FriendsTab.jsx';
import CollectionTab from './components/CollectionTab.jsx';
import RebirthTab from './components/RebirthTab.jsx';
import Modals from './components/Modals.jsx';
import CosmeticSheet from './components/Cosmetics.jsx';
import Tutorial from './components/Tutorial.jsx';

export default function App() {
  const game = useGame();
  const [tab, setTab] = useState('mine');
  const [tour, setTour] = useState(null); // { from } — الجولة التعليمية

  useEffect(() => {
    if (game.status !== 'ready') return;
    if (tab === 'friends') {
      game.refreshBoard();
      game.refreshRaidLog();
      if (!game.invite) game.loadInvite();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, game.status]);

  const badges = useMemo(() => {
    const player = game.player;
    if (!player) return {};
    return {
      collection: player.milestones.filter((m) => m.claimable).length,
      friends: (game.raidLog.incoming || []).filter((e) => e.canRevenge).length,
    };
  }, [game.player, game.raidLog]);

  // جولة أول دخول: تبدأ تلقائياً بعد إغلاق نافذة الترحيب، ويمكن إعادتها من «؟»
  useEffect(() => {
    if (game.status !== 'ready' || !game.player || tour) return;
    if (game.player.tutorialDone) return;
    try { if (localStorage.getItem('minewarr.tour.v1')) return; } catch {}
    if (game.modal) return;
    const timer = setTimeout(() => setTour({ from: tab }), 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, game.player?.tutorialDone, game.modal, tour]);

  const finishTour = (completed) => {
    try { localStorage.setItem('minewarr.tour.v1', 'done'); } catch {}
    setTab(completed ? 'mine' : (tour?.from || 'mine'));
    setTour(null);
    game.actions.tutorialDone();
  };

  if (game.status === 'loading') {
    return (
      <div className="app">
        <div className="topbar">
          <div className="topbar-row">
            <div className="topbar-title">⛏️ {t('appName')}</div>
          </div>
        </div>
        <div className="card"><div className="skeleton" style={{ width: '60%' }} /><div className="skeleton" /></div>
        <div className="card"><div className="skeleton" style={{ height: 120 }} /></div>
        <div className="center mt12"><span className="spinner" /></div>
        <p className="muted small center mt8">{t('common.loading')}</p>
      </div>
    );
  }

  if (game.status === 'fatal') {
    return (
      <div className="fatal">
        <div className="box card">
          <div className="big-emoji" style={{ fontSize: 46 }}>🪨</div>
          <div className="head">تعذّر فتح المنجم</div>
          <p className="body">{game.fatal}</p>
          <button className="btn primary big" onClick={() => window.location.reload()}>🔄 إعادة المحاولة</button>
          <p className="card-sub mt8">تأكد أن السيرفر يعمل على المنفذ 3001، أو افتح التطبيق من بوت تيليجرام.</p>
        </div>
      </div>
    );
  }

  const regionTheme = game.player?.region?.theme;

  return (
    <div
      className="app"
      style={regionTheme ? { '--region-from': regionTheme.from, '--region-to': regionTheme.to } : undefined}
    >
      <Header
        game={game}
        onHelp={() => game.setModal({ type: 'help' })}
        onOpenTab={setTab}
        onEditName={async () => {
          const currentName = game.player?.name || 'منقّب ضيف';
          const name = window.prompt('اسمك في وضع الضيف:', currentName);
          if (name && name.trim()) await game.changeNickname(name);
        }}
      />

      {tab === 'mine' && <MineTab game={game} />}
      {tab === 'upgrades' && <UpgradesTab game={game} catalog={game.catalog} />}
      {tab === 'friends' && <FriendsTab game={game} catalog={game.catalog} />}
      {tab === 'collection' && <CollectionTab game={game} catalog={game.catalog} />}
      {tab === 'rebirth' && <RebirthTab game={game} />}

      <TabBar tab={tab} setTab={setTab} badges={badges} />

      {game.floats.map((f) => (
        <span key={f.id} className={`float ${f.kind === 'gem' ? 'gem' : f.kind === 'relic' ? 'relic' : ''}`} style={{ left: f.x - 22, top: f.y - 22 }}>
          {f.text}
        </span>
      ))}

      <div className="toasts">
        {game.toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.kind || ''}`}>{toast.message}</div>
        ))}
      </div>

      <Modals game={game} catalog={game.catalog} onStartTour={() => setTour({ from: tab })} />
    {game.modal?.type === 'cosmetic' && (
      <CosmeticSheet game={game} onClose={() => game.setModal(null)} />
    )}

      {tour && (
        <Tutorial
          onFinish={() => finishTour(true)}
          onSkip={() => finishTour(false)}
          setTab={setTab}
        />
      )}
    </div>
  );
}
