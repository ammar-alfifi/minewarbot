// شاشة الأصدقاء: الدعوة، الهدف الجماعي، لوحة الصدارة، الغارات
import React, { useEffect } from 'react';
import { t } from '../i18n.js';
import { num, short, duration, relativeTime } from '../format.js';
import { Progress } from './ui.jsx';
import { useTick } from '../hooks/useGame.js';
import { shareText, copyToClipboard } from '../telegram.js';

function Avatar({ entry }) {
  if (entry.photoUrl) return <span className="lb-avatar"><img src={entry.photoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" /></span>;
  return <span className="lb-avatar">{entry.regionEmoji || '⛏️'}</span>;
}

export default function FriendsTab({ game, catalog }) {
  const { player, board, boardLoading, raidLog, invite, actions, refreshBoard, refreshRaidLog, loadInvite, setModal, pushToast, busy } = game;
  useTick(1000);

  useEffect(() => {
    refreshBoard(board.scope || 'friends');
    refreshRaidLog();
    if (!invite) loadInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!player || !catalog) return null;

  const now = Date.now();
  const cooldownLeft = Math.max(0, player.raid.cooldownUntil - now);
  const shieldLeft = Math.max(0, player.raid.shieldUntil - now);
  const capReached = player.raid.winsToday >= player.raid.dailyCap;
  const referral = catalog.referral || {};

  const onShare = async () => {
    const data = invite || await loadInvite();
    if (!data) return;
    shareText(data.shareText, data.appLink || data.botLink);
  };

  const onCopy = async () => {
    const data = invite || await loadInvite();
    if (!data) return;
    const ok = await copyToClipboard(data.botLink);
    pushToast(ok ? t('friends.copied') : data.botLink, ok ? 'success' : '');
  };

  const onClaim = async (id) => {
    const res = await actions.claim('group', id);
    if (res) {
      pushToast(`🎁 +${res.result.reward.gems} جواهر`, 'success');
    }
  };

  const onRaid = (entry, revenge = false) => {
    setModal({ type: 'raid', payload: { entry, revenge } });
  };

  const onRaidLog = (entry) => {
    setModal({
      type: 'raid',
      payload: {
        entry: { playerId: entry.opponentId, name: entry.opponentName, raidEstimate: null, potentialLoot: entry.amount, shieldUntil: 0 },
        revenge: true,
      },
    });
  };

  return (
    <div>
      <div className="card">
        <h3 className="card-title">🎁 {t('friends.invite')}</h3>
        <p className="card-sub">{t('friends.inviteReward', { a: referral.inviterGems ?? 3, b: referral.inviteeGems ?? 2 })}</p>
        <div className="flex mt8" style={{ gap: 8 }}>
          <button className="btn primary grow" onClick={onShare}>📤 {t('friends.share')}</button>
          <button className="btn ghost grow" onClick={onCopy}>🔗 {t('friends.copy')}</button>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">🕳️ {player.group.emoji} {t('friends.group')}</h3>
        <div className="between mb8">
          <span className="small muted">{t('friends.groupDesc')}</span>
          <b>{short(player.group.contributed)} / {short(player.group.target)}</b>
        </div>
        <Progress value={player.group.contributed} max={player.group.target} kind="group" />
        <div className="between mt8">
          <span className="small">{t('friends.myShare')}: <b>{short(player.group.myContribution)}</b></span>
          <span className="small muted">{Math.floor((player.group.contributed / player.group.target) * 100)}%</span>
        </div>
        <div className="mt12">
          {player.group.tiers.map((tier) => (
            <div key={tier.id} className="row">
              <span className="emoji">🏅</span>
              <div className="grow">
                <div className="title">{tier.label}</div>
                <div className="desc">{t('friends.contribution')} {short(tier.contribution)} → {tier.gems} 💎</div>
              </div>
              {tier.claimed ? (
                <span className="tag">{t('friends.claimed')}</span>
              ) : (
                <button className="btn success small" disabled={!tier.claimable || busy} onClick={() => onClaim(tier.id)}>
                  {tier.claimable ? t('friends.claim') : `${Math.min(100, Math.floor((player.group.myContribution / tier.contribution) * 100))}%`}
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="card-sub">
          {player.group.chestReached
            ? `🎉 ${t('friends.chestReached', { g: player.group.chestGems })}`
            : t('friends.chestPending', { g: player.group.chestGems })}
        </p>
      </div>

      <div className={`banner ${shieldLeft > 0 ? 'shield' : ''}`}>
        <span className="em">{shieldLeft > 0 ? '🛡️' : '⚠️'}</span>
        <div className="grow">
          <b>{t('friends.shield')}: {shieldLeft > 0 ? `${duration(shieldLeft)}` : '—'}</b>
          <div className="muted small">{shieldLeft > 0 ? t('friends.shieldActive', { time: duration(shieldLeft) }) : t('friends.shieldNone')}</div>
        </div>
      </div>
      <div className="card tight">
        <div className="between">
          <span className="small">⚔️ {t('friends.dailyCap')}: <b>{player.raid.winsToday}/{player.raid.dailyCap}</b></span>
          <span className="small">⏳ {cooldownLeft > 0 ? `${t('friends.cooldown')} ${duration(cooldownLeft)}` : 'جاهز للغارة'}</span>
        </div>
      </div>

      <div className="card">
        <div className="between mb8">
          <h3 className="card-title" style={{ margin: 0 }}>🏆 {t('friends.boards.' + (board.scope === 'friends' ? 'friends' : board.scope))}</h3>
          {boardLoading && <span className="spinner" />}
        </div>
        <div className="seg" style={{ marginBottom: 10 }}>
          {['friends', 'season', 'wealth', 'collection', 'global'].map((scope) => (
            <button key={scope} className={board.scope === scope ? 'on' : ''} onClick={() => refreshBoard(scope)}>
              {t('friends.boards.' + scope)}
            </button>
          ))}
        </div>
        {board.entries.length === 0 && <p className="muted small center">{t('friends.empty')}</p>}
        {board.entries.map((entry) => {
          const shielded = entry.shieldUntil > now;
          return (
            <div key={entry.playerId} className="lb-row">
              <span className={`lb-rank ${entry.rank <= 3 ? 'top' : ''}`}>
                {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
              </span>
              <Avatar entry={entry} />
              <div className="grow">
                <div className="lb-name">
                  {entry.name}
                  {entry.isMe && <span className="tag me">أنت</span>}
                  {entry.isFriend && !entry.isMe && <span className="tag friend">رفيق</span>}
                  {shielded && <span className="tag shielded">🛡️</span>}
                </div>
                <div className="lb-sub">
                  {entry.title?.emoji} {entry.title?.name} · {entry.regionEmoji} {entry.relics}🏺
                  {entry.raidEstimate != null && <> · {t('friends.estimate')} {entry.raidEstimate}%</>}
                </div>
              </div>
              <div className="lb-score">
                {short(entry.score)}
                <small>{t('friends.boards.' + board.scope)}</small>
              </div>
              {!entry.isMe && (
                <button
                  className="btn danger small"
                  disabled={busy || shielded || cooldownLeft > 0 || capReached}
                  onClick={() => onRaid(entry)}
                  title={shielded ? 'الخصم محمي' : ''}
                >
                  ⚔️
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="card">
        <h3 className="card-title">📜 {t('friends.log')}</h3>
        {raidLog.incoming?.length > 0 && (
          <>
            <div className="small muted mb8">{t('friends.incoming')}</div>
            {raidLog.incoming.slice(0, 6).map((entry, i) => (
              <div key={i} className="row">
                <span className="emoji">{entry.success ? '💥' : '🛡️'}</span>
                <div className="grow">
                  <div className="title">{entry.opponent?.name} <span className="tag">{relativeTime(entry.at)}</span></div>
                  <div className="desc">{entry.success ? `${t('friends.stole')} ${num(entry.amount)} 🪙` : t('friends.failed')}</div>
                </div>
                {entry.canRevenge && (
                  <button className="btn danger small" disabled={busy || cooldownLeft > 0 || capReached} onClick={() => onRaidLog(entry)}>
                    {t('friends.revenge')}
                  </button>
                )}
              </div>
            ))}
          </>
        )}
        {raidLog.outgoing?.length > 0 && (
          <>
            <div className="small muted mb8 mt12">{t('friends.outgoing')}</div>
            {raidLog.outgoing.slice(0, 6).map((entry, i) => (
              <div key={i} className="row">
                <span className="emoji">{entry.success ? '🏆' : '💨'}</span>
                <div className="grow">
                  <div className="title">{entry.opponent?.name} <span className="tag">{relativeTime(entry.at)}</span></div>
                  <div className="desc">{entry.success ? `${t('friends.stole')} ${num(entry.amount)} 🪙` : t('friends.failed')}</div>
                </div>
              </div>
            ))}
          </>
        )}
        {!raidLog.incoming?.length && !raidLog.outgoing?.length && <p className="muted small">{t('friends.noLog')}</p>}
        <p className="card-sub">
          الغارات ودّية: حتى {Math.round(player.raid.stealPct * 100)}% من عملات الخصم بحد أقصى، والضحية تكسب درعاً وفرصة ثأر. لا تُسرق الجواهر أو الآثار أبداً.
        </p>
      </div>
    </div>
  );
}
